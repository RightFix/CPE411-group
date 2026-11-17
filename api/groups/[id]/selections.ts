import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const pg = require("pg") as typeof import("pg");
const fs = require("fs") as typeof import("fs");

type Group = { id: number; name: string; students: { sn: number; name: string; regNo: string }[] };
type Topic = { id: number; title: string; subtopics: string[] };

const roleIds = new Set(["presenter", "research", "slides"]);

/** Normalize a phone string to digits only. */
function toDigits(v: string) {
  return v.replace(/[^\d]/g, "");
}

/** Validate an optional WhatsApp number (Nigerian formats expected). Returns normalized stored value or null. */
function normalizeWhatsapp(raw: unknown): { error?: string; value: string | null } {
  const s = String(raw ?? "").trim();
  if (!s) return { value: null };
  if (!/^\+?[\d\s\-()]{7,20}$/.test(s)) return { error: "Invalid WhatsApp number." };
  const digits = toDigits(s);
  if (digits.length < 7 || digits.length > 15) return { error: "Invalid WhatsApp number." };
  return { value: s.replace(/\s+/g, " ") };
}
let pool: import("pg").Pool | null = null;
let dataCache: { groups: Group[]; topics: Topic[] } | null = null;

function getPool() {
  if (!pool) {
    const connectionString = (process.env.DB_URI || process.env.DATABASE_URL || "").trim();
    if (!connectionString) throw new Error("DB_URI is not set");
    if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
      throw new Error("DB_URI must start with postgresql:// or postgres:// (check your Vercel environment variable)");
    }
    try {
      const u = new URL(connectionString);
      if (!u.hostname || u.hostname === "base") {
        throw new Error("DB_URI host is invalid. Verify the full Supabase connection string in Vercel env vars.");
      }
    } catch (e: any) {
      if (String(e?.message || "").includes("DB_URI")) throw e;
      throw new Error("DB_URI is malformed. Ensure it is a valid Supabase connection string.");
    }
    const needsSsl = !/sslmode=disable/i.test(connectionString) && !/localhost|127\.0\.0\.1/.test(connectionString);
    pool = new pg.Pool({
      connectionString,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
      max: 3,
    });
  }
  return pool;
}

async function withClient<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try { return await fn(client); } finally { client.release(); }
}

async function ensureSchema() {
  await withClient(async (c) => {
    await c.query(`
      CREATE TABLE IF NOT EXISTS group_selections (
        group_id INTEGER NOT NULL,
        student_sn INTEGER NOT NULL,
        subtopic_index INTEGER,
        role_id TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (group_id, student_sn)
      );
      CREATE INDEX IF NOT EXISTS idx_group_selections_group ON group_selections(group_id);
      ALTER TABLE group_selections ADD COLUMN IF NOT EXISTS whatsapp TEXT;
    `);
  });
}

function loadData() {
  if (dataCache) return dataCache;
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const groupsPath = path.join(__dirname, "..", "..", "_data", "groups.json");
  const topicsPath = path.join(__dirname, "..", "..", "_data", "topics.json");
  dataCache = {
    groups: JSON.parse(fs.readFileSync(groupsPath, "utf8")),
    topics: JSON.parse(fs.readFileSync(topicsPath, "utf8")),
  };
  return dataCache;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { groups, topics } = loadData();
    await ensureSchema();
    const groupId = Number(req.query.id);
    if (!Number.isInteger(groupId)) return res.status(400).json({ error: "Invalid group id." });
    const group = groups.find(g => g.id === groupId);
    const topic = topics.find(t => t.id === groupId);
    if (!group || !topic) return res.status(404).json({ error: "Group not found." });

    if (req.method === "GET") {
      const rows = await withClient(async (c) =>
        (await c.query("SELECT student_sn, subtopic_index, role_id, whatsapp FROM group_selections WHERE group_id = $1", [groupId])).rows
      );
      const bySn = new Map<number, { subtopicIndex: number | null; roleId: string | null; whatsapp: string | null }>();
      for (const row of rows) {
        const idx = row.subtopic_index == null ? null : Number(row.subtopic_index);
        bySn.set(Number(row.student_sn), {
          subtopicIndex: idx != null && idx >= 0 && idx < topic.subtopics.length ? idx : null,
          roleId: typeof row.role_id === "string" && roleIds.has(row.role_id) ? row.role_id : null,
          whatsapp: typeof row.whatsapp === "string" && row.whatsapp ? row.whatsapp : null,
        });
      }
      const selections = group.students.map(s => ({ sn: s.sn, ...(bySn.get(s.sn) ?? { subtopicIndex: null, roleId: null, whatsapp: null }) }));
      return res.status(200).json({ selections });
    }

    if (req.method === "POST") {
      const body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body) || {};
      const studentSn = Number(body.studentSn);
      const subtopicIndex = body.subtopicIndex == null || body.subtopicIndex === "" ? null : Number(body.subtopicIndex);
      const roleId = body.roleId == null || body.roleId === "" ? null : String(body.roleId);
      const regNoRaw = String(body.regNo || "").trim().toLowerCase();
      if (!regNoRaw) return res.status(401).json({ error: "Login required." });
      const student = group.students.find(s => s.sn === studentSn);
      if (!student) return res.status(400).json({ error: "Student not found in this group." });
      if (student.regNo.trim().toLowerCase() !== regNoRaw) {
        return res.status(403).json({ error: "You can only edit your own selection." });
      }
      if (subtopicIndex != null && (!Number.isInteger(subtopicIndex) || subtopicIndex < 0 || subtopicIndex >= topic.subtopics.length)) {
        return res.status(400).json({ error: "Invalid subtopic." });
      }
      if (roleId != null && !roleIds.has(roleId)) return res.status(400).json({ error: "Invalid role." });
      const wa = normalizeWhatsapp(body.whatsapp);
      if (wa.error) return res.status(400).json({ error: wa.error });
      await withClient(async (c) => {
        await c.query(
          `INSERT INTO group_selections (group_id, student_sn, subtopic_index, role_id, whatsapp, updated_at)
           VALUES ($1,$2,$3,$4,$5,NOW())
           ON CONFLICT (group_id, student_sn)
           DO UPDATE SET subtopic_index = EXCLUDED.subtopic_index, role_id = EXCLUDED.role_id, whatsapp = EXCLUDED.whatsapp, updated_at = NOW()`,
          [groupId, studentSn, subtopicIndex, roleId, wa.value]
        );
      });
      const rows = await withClient(async (c) =>
        (await c.query("SELECT student_sn, subtopic_index, role_id, whatsapp FROM group_selections WHERE group_id = $1", [groupId])).rows
      );
      const bySn = new Map<number, { subtopicIndex: number | null; roleId: string | null; whatsapp: string | null }>();
      for (const row of rows) {
        const idx = row.subtopic_index == null ? null : Number(row.subtopic_index);
        bySn.set(Number(row.student_sn), {
          subtopicIndex: idx != null && idx >= 0 && idx < topic.subtopics.length ? idx : null,
          roleId: typeof row.role_id === "string" && roleIds.has(row.role_id) ? row.role_id : null,
          whatsapp: typeof row.whatsapp === "string" && row.whatsapp ? row.whatsapp : null,
        });
      }
      const selections = group.students.map(s => ({ sn: s.sn, ...(bySn.get(s.sn) ?? { subtopicIndex: null, roleId: null, whatsapp: null }) }));
      return res.status(200).json({ selections });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("API error:", e);
    return res.status(500).json({ error: e?.message || "Server error", detail: String(e) });
  }
}
