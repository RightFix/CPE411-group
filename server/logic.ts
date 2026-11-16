import { groups } from "../src/data/groups.js";
import { topics } from "../src/data/topics.js";
import { withClient } from "./db.js";

const roleIds = new Set(["presenter", "research", "slides"]);

export async function getGroupSelections(groupId: number) {
  const group = groups.find(g => g.id === groupId);
  const topic = topics.find(t => t.id === groupId);
  if (!group || !topic) return null;
  return withClient(async (c) => {
    const res = await c.query(
      "SELECT student_sn, subtopic_index, role_id FROM group_selections WHERE group_id = $1",
      [groupId]
    );
    const bySn = new Map<number, { subtopicIndex: number | null; roleId: string | null }>();
    for (const row of res.rows) {
      const idx = row.subtopic_index == null ? null : Number(row.subtopic_index);
      bySn.set(Number(row.student_sn), {
        subtopicIndex: idx != null && idx >= 0 && idx < topic.subtopics.length ? idx : null,
        roleId: typeof row.role_id === "string" && roleIds.has(row.role_id) ? row.role_id : null,
      });
    }
    return group.students.map(s => ({
      ...bySn.get(s.sn) ?? { subtopicIndex: null, roleId: null },
      sn: s.sn,
    }));
  });
}

export async function setGroupSelection(
  groupId: number,
  studentSn: number,
  subtopicIndex: number | null,
  roleId: string | null
) {
  const group = groups.find(g => g.id === groupId);
  const topic = topics.find(t => t.id === groupId);
  if (!group || !topic) return { status: 404, body: { error: "Group not found." } };
  if (!group.students.some(s => s.sn === studentSn)) return { status: 400, body: { error: "Student not found in this group." } };
  if (subtopicIndex != null && (!Number.isInteger(subtopicIndex) || subtopicIndex < 0 || subtopicIndex >= topic.subtopics.length)) {
    return { status: 400, body: { error: "Invalid subtopic." } };
  }
  if (roleId != null && !roleIds.has(roleId)) return { status: 400, body: { error: "Invalid role." } };

  await withClient(async (c) => {
    await c.query(
      `INSERT INTO group_selections (group_id, student_sn, subtopic_index, role_id, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (group_id, student_sn)
       DO UPDATE SET subtopic_index = EXCLUDED.subtopic_index, role_id = EXCLUDED.role_id, updated_at = NOW()`,
      [groupId, studentSn, subtopicIndex, roleId]
    );
  });
  const selections = await getGroupSelections(groupId);
  return { status: 200, body: { selections } };
}
