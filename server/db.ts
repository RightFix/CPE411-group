import pg from "pg";

const { Pool } = pg;
let pool: pg.Pool | null = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    const needsSsl = !/sslmode=disable/i.test(connectionString) && !/localhost|127\.0\.0\.1/.test(connectionString);
    pool = new Pool({
      connectionString,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
      max: Number(process.env.PG_POOL_MAX || 5),
    });
  }
  return pool;
}

export async function withClient<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function ensureSchema() {
  await withClient(async (c) => {
    await c.query(`
      CREATE TABLE IF NOT EXISTS selections (
        student_id INTEGER PRIMARY KEY,
        subtopic_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sel_topic_role ON selections(subtopic_id, role_id);
    `);
  });
}
