import pg from "pg";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: pg.Pool | undefined;
}

export function getPool() {
  if (!global.__pgPool) {
    const connectionString = process.env.DB_URI;
    if (!connectionString) throw new Error("DB_URI is not set");
    const needsSsl = !/sslmode=disable/i.test(connectionString) && !/localhost|127\.0\.0\.1/.test(connectionString);
    global.__pgPool = new Pool({
      connectionString,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
      max: 3,
    });
  }
  return global.__pgPool;
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
      CREATE TABLE IF NOT EXISTS group_selections (
        group_id INTEGER NOT NULL,
        student_sn INTEGER NOT NULL,
        subtopic_index INTEGER,
        role_id TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (group_id, student_sn)
      );
      CREATE INDEX IF NOT EXISTS idx_group_selections_group ON group_selections(group_id);
    `);
  });
}
