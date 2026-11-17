import { createRequire } from "module";
import { withClient } from "./db.js";

const require = createRequire(import.meta.url);
const groups = require("../src/data/groups.json") as { id: number; name: string; students: { sn: number; name: string; regNo: string }[] }[];
const topics = require("../src/data/topics.json") as { id: number; title: string; subtopics: string[] }[];

const roleIds = new Set(["presenter", "research", "slides"]);

function normalizeWhatsapp(raw: unknown): { error?: string; value: string | null } {
  const s = String(raw ?? "").trim();
  if (!s) return { value: null };
  if (!/^\+?[\d\s\-()]{7,20}$/.test(s)) return { error: "Invalid WhatsApp number." };
  const digits = s.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return { error: "Invalid WhatsApp number." };
  return { value: s.replace(/\s+/g, " ") };
}

export async function getGroupSelections(groupId: number) {
  const group = groups.find(g => g.id === groupId);
  const topic = topics.find(t => t.id === groupId);
  if (!group || !topic) return null;
  return withClient(async (c) => {
    const res = await c.query(
      "SELECT student_sn, subtopic_index, role_id, whatsapp FROM group_selections WHERE group_id = $1",
      [groupId]
    );
    const bySn = new Map<number, { subtopicIndex: number | null; roleId: string | null; whatsapp: string | null }>();
    for (const row of res.rows) {
      const idx = row.subtopic_index == null ? null : Number(row.subtopic_index);
      bySn.set(Number(row.student_sn), {
        subtopicIndex: idx != null && idx >= 0 && idx < topic.subtopics.length ? idx : null,
        roleId: typeof row.role_id === "string" && roleIds.has(row.role_id) ? row.role_id : null,
        whatsapp: typeof row.whatsapp === "string" && row.whatsapp ? row.whatsapp : null,
      });
    }
    return group.students.map(s => ({
      ...bySn.get(s.sn) ?? { subtopicIndex: null, roleId: null, whatsapp: null },
      sn: s.sn,
    }));
  });
}

export async function setGroupSelection(
  groupId: number,
  studentSn: number,
  subtopicIndex: number | null,
  roleId: string | null,
  regNo?: string,
  whatsapp?: string
) {
  const group = groups.find(g => g.id === groupId);
  const topic = topics.find(t => t.id === groupId);
  if (!group || !topic) return { status: 404, body: { error: "Group not found." } };
  const regNoNorm = String(regNo || "").trim().toLowerCase();
  if (!regNoNorm) return { status: 401, body: { error: "Login required." } };
  const student = group.students.find(s => s.sn === studentSn);
  if (!student) return { status: 400, body: { error: "Student not found in this group." } };
  if (student.regNo.trim().toLowerCase() !== regNoNorm) {
    return { status: 403, body: { error: "You can only edit your own selection." } };
  }
  if (subtopicIndex != null && (!Number.isInteger(subtopicIndex) || subtopicIndex < 0 || subtopicIndex >= topic.subtopics.length)) {
    return { status: 400, body: { error: "Invalid subtopic." } };
  }
  if (roleId != null && !roleIds.has(roleId)) return { status: 400, body: { error: "Invalid role." } };
  const wa = normalizeWhatsapp(whatsapp);
  if (wa.error) return { status: 400, body: { error: wa.error } };

  await withClient(async (c) => {
    await c.query(
      `INSERT INTO group_selections (group_id, student_sn, subtopic_index, role_id, whatsapp, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (group_id, student_sn)
       DO UPDATE SET subtopic_index = EXCLUDED.subtopic_index, role_id = EXCLUDED.role_id, whatsapp = EXCLUDED.whatsapp, updated_at = NOW()`,
      [groupId, studentSn, subtopicIndex, roleId, wa.value]
    );
  });
  const selections = await getGroupSelections(groupId);
  return { status: 200, body: { selections } };
}
