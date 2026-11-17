import "dotenv/config";
import fs from "node:fs";
import { createRequire } from "module";
import { ensureSchema, withClient } from "../server/db.js";

const require = createRequire(import.meta.url);
const groups = require("../src/data/groups.json") as { id: number; name: string; students: { sn: number; name: string; regNo: string }[] }[];
const topics = require("../src/data/topics.json") as { id: number; title: string; subtopics: string[] }[];

function esc(v: string) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const roleLabel: Record<string, string> = { presenter: "Presenter", research: "Researcher", slides: "Slide Creator" };

async function main() {
  await ensureSchema();
  const rows = await withClient(async (c) => (await c.query("SELECT group_id, student_sn, subtopic_index, role_id, whatsapp FROM group_selections")).rows);
  const sel = new Map<string, any>();
  for (const r of rows) sel.set(`${r.group_id}:${r.student_sn}`, r);

  const lines = ["Group,S/N,Name,Reg No,Subtopic,Role"];
  for (const g of groups) {
    const topic = topics.find(t => t.id === g.id)!;
    for (const s of g.students) {
      const r = sel.get(`${g.id}:${s.sn}`);
      const idx = r?.subtopic_index != null ? Number(r.subtopic_index) : null;
      const sub = idx != null && topic.subtopics[idx] ? `${idx + 1}. ${topic.subtopics[idx]}` : "";
      const role = r?.role_id ? (roleLabel[r.role_id] || r.role_id) : "Not selected";
      lines.push([`Group ${g.id}`, s.sn, esc(s.name), esc(s.regNo), esc(sub), esc(role)].join(","));
    }
  }
  const out = "selections-export.csv";
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
  console.log(`Exported ${lines.length - 1} rows to ${out}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
