import pg from "pg";

const { Pool } = pg;
let pool: pg.Pool | null = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DB_URI;
    if (!connectionString) throw new Error("DB_URI is not set");
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
      CREATE TABLE IF NOT EXISTS group_selections (
        group_id INTEGER NOT NULL,
        student_sn INTEGER NOT NULL,
        subtopic_index INTEGER,
        role_id TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (group_id, student_sn)
      );
      CREATE INDEX IF NOT EXISTS idx_group_selections_group ON group_selections(group_id);
      ALTER TABLE group_selections ADD COLUMN IF NOT EXISTS whatsapp TEXT;

      CREATE TABLE IF NOT EXISTS group_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id INTEGER NOT NULL,
        student_sn INTEGER NOT NULL,
        uploader_name TEXT NOT NULL,
        uploader_reg_no TEXT NOT NULL,
        subtopic_index INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('file', 'link')),
        title TEXT NOT NULL,
        note TEXT,
        storage_path TEXT,
        file_name TEXT,
        mime_type TEXT,
        size_bytes BIGINT,
        external_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_group_materials_group ON group_materials(group_id, created_at DESC);
    `);
  });
}
