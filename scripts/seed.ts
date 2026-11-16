import "dotenv/config";
import { ensureSchema, withClient } from "../server/db.js";

async function main() {
  await ensureSchema();
  console.log("Database schema ensured (selections table ready). No seed rows inserted; students/subtopics are loaded from source data.");
  await withClient(async (c) => {
    const r = await c.query("SELECT COUNT(*)::int AS c FROM selections");
    console.log(`Current selections: ${r.rows[0].c}`);
  });
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
