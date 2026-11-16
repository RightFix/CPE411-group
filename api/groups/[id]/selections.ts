import type { VercelRequest, VercelResponse } from "@vercel/node";
import { groups } from "../../../src/data/groups";
import { topics } from "../../../src/data/topics";
import { ensureSchema, withClient } from "../../_db";

const roleIds = new Set(["presenter", "research", "slides"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureSchema();
    const groupId = Number(req.query.id);
    if (!Number.isInteger(groupId)) return res.status(400).json({ error: "Invalid group id." });
    const group = groups.find(g => g.id === groupId);
    const topic = topics.find(t => t.id === groupId);
    if (!group || !topic) return res.status(404).json({ error: "Group not found." });

    if (req.method === "GET") {
      const rows = await withClient(async (c) =>
        (await c.query("SELECT student_sn, subtopic_index, role_id FROM group_selections WHERE group_id = $1", [groupId])).rows
      );
      const bySn = new Map<number, { subtopicIndex: number | null; roleId: string | null }>();
      for (const row of rows) {
        const idx = row.subtopic_index == null ? null : Number(row.subtopic_index);
        bySn.set(Number(row.student_sn), {
          subtopicIndex: idx != null && idx >= 0 && idx < topic.subtopics.length ? idx : null,
          roleId: typeof row.role_id === "string" && roleIds.has(row.role_id) ? row.role_id : null,
        });
      }
      const selections = group.students.map(s => ({ sn: s.sn, ...(bySn.get(s.sn) ?? { subtopicIndex: null, roleId: null }) }));
      return res.status(200).json({ selections });
    }

    if (req.method === "POST") {
      const body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body) || {};
      const studentSn = Number(body.studentSn);
      const subtopicIndex = body.subtopicIndex == null || body.subtopicIndex === "" ? null : Number(body.subtopicIndex);
      const roleId = body.roleId == null || body.roleId === "" ? null : String(body.roleId);
      if (!group.students.some(s => s.sn === studentSn)) return res.status(400).json({ error: "Student not found in this group." });
      if (subtopicIndex != null && (!Number.isInteger(subtopicIndex) || subtopicIndex < 0 || subtopicIndex >= topic.subtopics.length)) {
        return res.status(400).json({ error: "Invalid subtopic." });
      }
      if (roleId != null && !roleIds.has(roleId)) return res.status(400).json({ error: "Invalid role." });
      await withClient(async (c) => {
        await c.query(
          `INSERT INTO group_selections (group_id, student_sn, subtopic_index, role_id, updated_at)
           VALUES ($1,$2,$3,$4,NOW())
           ON CONFLICT (group_id, student_sn)
           DO UPDATE SET subtopic_index = EXCLUDED.subtopic_index, role_id = EXCLUDED.role_id, updated_at = NOW()`,
          [groupId, studentSn, subtopicIndex, roleId]
        );
      });
      const rows = await withClient(async (c) =>
        (await c.query("SELECT student_sn, subtopic_index, role_id FROM group_selections WHERE group_id = $1", [groupId])).rows
      );
      const bySn = new Map<number, { subtopicIndex: number | null; roleId: string | null }>();
      for (const row of rows) {
        const idx = row.subtopic_index == null ? null : Number(row.subtopic_index);
        bySn.set(Number(row.student_sn), {
          subtopicIndex: idx != null && idx >= 0 && idx < topic.subtopics.length ? idx : null,
          roleId: typeof row.role_id === "string" && roleIds.has(row.role_id) ? row.role_id : null,
        });
      }
      const selections = group.students.map(s => ({ sn: s.sn, ...(bySn.get(s.sn) ?? { subtopicIndex: null, roleId: null }) }));
      return res.status(200).json({ selections });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}
