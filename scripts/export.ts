import "dotenv/config";
import fs from "node:fs";
import { ensureSchema } from "../server/db.js";
import { getState } from "../server/logic.js";

function esc(v: string) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  await ensureSchema();
  const state = await getState();
  const subById = new Map(state.groups.map((g: any) => [g.id, g]));
  const roleLabel: Record<string, string> = { presenter: "Presenter", research: "Researcher", slides: "Slide Creator" };
  const lines = ["#,Name,Reg No,Subtopic,Role"];
  for (const r of state.rows) {
    const sub = r.subtopicId ? subById.get(r.subtopicId) : null;
    lines.push([
      r.index,
      esc(r.name),
      esc(r.regNo),
      esc(sub ? `${sub.letter}. ${sub.short}` : ""),
      esc(r.roleId ? (roleLabel[r.roleId] || r.roleId) : "Not selected"),
    ].join(","));
  }
  const out = "selections-export.csv";
  fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
  console.log(`Exported ${state.rows.length} rows to ${out}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
