import { students } from "../src/data/students.js";
import { subtopics, roles } from "../src/data/subtopics.js";
import { withClient } from "./db.js";

type RoleId = "presenter" | "research" | "slides";

export function normalizeName(s: string) {
  return String(s || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .split("")
    .sort()
    .join("");
}

export function normalizeReg(s: string) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function findStudent(name: string, regNo: string) {
  const n = normalizeName(name);
  const r = normalizeReg(regNo);
  return students.find((s) => normalizeReg(s.regNo) === r && normalizeName(s.name) === n) || null;
}

export async function getState() {
  return withClient(async (c) => {
    const res = await c.query("SELECT student_id, subtopic_id, role_id FROM selections");
    const selByStudent = new Map<number, { subtopicId: string; roleId: RoleId }>();
    for (const row of res.rows) {
      selByStudent.set(Number(row.student_id), { subtopicId: row.subtopic_id, roleId: row.role_id as RoleId });
    }
    const rows = students
      .slice()
      .sort((a, b) => a.regNo.localeCompare(b.regNo))
      .map((s, i) => {
        const sel = selByStudent.get(s.id);
        return {
          index: i + 1,
          id: s.id,
          name: s.name,
          regNo: s.regNo,
          subtopicId: sel?.subtopicId ?? null,
          roleId: sel?.roleId ?? null,
        };
      });
    const groups = subtopics.map((t) => {
      const roleInfo = roles.map((r) => {
        const members = rows
          .filter((x) => x.subtopicId === t.id && x.roleId === r.id)
          .sort((a, b) => a.regNo.localeCompare(b.regNo))
          .map((x) => ({ name: x.name, regNo: x.regNo, id: x.id }));
        return { id: r.id, label: r.label, limit: r.limit, filled: members.length, open: r.limit - members.length, members };
      });
      const filled = roleInfo.reduce((s, r) => s + r.filled, 0);
      return { ...t, roles: roleInfo, filled, open: 7 - filled };
    });
    const filledSeats = rows.filter((r) => r.subtopicId).length;
    return {
      rows,
      groups,
      summary: {
        students: students.length,
        seats: 35,
        filled: filledSeats,
        open: Math.max(0, 35 - filledSeats),
        unplaced: students.length - filledSeats,
      },
    };
  });
}

export async function pickSeat(name: string, regNo: string, subtopicId: string, roleId: string) {
  const student = findStudent(name, regNo);
  if (!student) return { status: 400, body: { error: "Name and registration number do not match any student." } };
  if (!subtopics.some((t) => t.id === subtopicId)) return { status: 400, body: { error: "Invalid subtopic." } };
  const role = roles.find((r) => r.id === roleId);
  if (!role) return { status: 400, body: { error: "Invalid role." } };

  const result = await withClient(async (c) => {
    await c.query("BEGIN");
    try {
      await c.query("SELECT pg_advisory_xact_lock(411001)");
      const total = await c.query("SELECT COUNT(*)::int AS c FROM selections");
      const existing = await c.query("SELECT subtopic_id, role_id FROM selections WHERE student_id = $1 FOR UPDATE", [student.id]);
      const current = existing.rows[0] as { subtopic_id: string; role_id: string } | undefined;
      if (current && current.subtopic_id === subtopicId && current.role_id === roleId) {
        await c.query("COMMIT");
        return { ok: true, message: "You already have this seat." } as const;
      }
      const roleCount = await c.query(
        "SELECT COUNT(*)::int AS c FROM selections WHERE subtopic_id = $1 AND role_id = $2",
        [subtopicId, roleId]
      );
      if (roleCount.rows[0].c >= role.limit) {
        await c.query("ROLLBACK");
        return { ok: false, status: 409, error: "That role is full. Please choose another seat." } as const;
      }
      if (!current && total.rows[0].c >= 35) {
        await c.query("ROLLBACK");
        return { ok: false, status: 409, error: "All 35 seats are taken." } as const;
      }
      if (current) {
        await c.query("UPDATE selections SET subtopic_id=$1, role_id=$2, updated_at=NOW() WHERE student_id=$3", [subtopicId, roleId, student.id]);
      } else {
        await c.query("INSERT INTO selections (student_id, subtopic_id, role_id) VALUES ($1,$2,$3)", [student.id, subtopicId, roleId]);
      }
      await c.query("COMMIT");
      return { ok: true, message: "Selection saved." } as const;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    }
  });
  if (!result.ok) return { status: result.status, body: { error: result.error } };
  const state = await getState();
  return { status: 200, body: { message: result.message, state, studentId: student.id } };
}

export async function releaseSeat(name: string, regNo: string) {
  const student = findStudent(name, regNo);
  if (!student) return { status: 400, body: { error: "Name and registration number do not match any student." } };
  await withClient(async (c) => {
    await c.query("DELETE FROM selections WHERE student_id = $1", [student.id]);
  });
  const state = await getState();
  return { status: 200, body: { message: "Seat released.", state, studentId: student.id } };
}
