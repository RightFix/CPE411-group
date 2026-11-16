import "dotenv/config";
import { ensureSchema, withClient } from "../server/db.js";

async function main() {
  await ensureSchema();
  await withClient(async (c) => {
    const r = await c.query("SELECT COUNT(*)::int AS c FROM group_selections");
    console.log(`Database schema ensured (group_selections). Current rows: ${r.rows[0].c}`);
  });
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
