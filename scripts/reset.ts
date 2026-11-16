import "dotenv/config";
import { ensureSchema, withClient } from "../server/db.js";

async function main() {
  if (!process.argv.includes("--confirm")) {
    console.error("Refusing to reset without --confirm. Usage: npm run db:reset -- --confirm");
    process.exit(1);
  }
  await ensureSchema();
  await withClient(async (c) => {
    await c.query("TRUNCATE selections");
  });
  console.log("All selections cleared.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
