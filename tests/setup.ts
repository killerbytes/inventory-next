import { pool } from "@/server/db/drizzle";

let isSchemaInitialized = false;

/**
 * Setup database connection for integration tests.
 * Ensures connection is active and schema exists.
 */
export async function setupDatabase(): Promise<void> {
  if (process.env.DB_NAME !== "inventory_test_db") {
    throw new Error(
      `Safety guard violation: Tests must run against 'inventory_test_db', but current DB_NAME is '${process.env.DB_NAME}'. Aborting.`
    );
  }
  const client = await pool.connect();
  client.release();

  if (!isSchemaInitialized) {
    await pool.query(`
      ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS search_text TSVECTOR DEFAULT ''::tsvector;
      CREATE INDEX IF NOT EXISTS idx_products_search_text ON "Products" USING GIN (search_text);
    `);
    isSchemaInitialized = true;
  }
}

let cachedTableTruncateSql: string | null = null;

/**
 * Reset database data (TRUNCATE all tables with RESTART IDENTITY CASCADE).
 * Empties all tables and resets sequences in ~10-20ms without slow DDL recreation.
 * Strictly enforced to only operate on 'inventory_test_db'.
 */
export async function resetDatabase(): Promise<void> {
  if (process.env.DB_NAME !== "inventory_test_db") {
    throw new Error(
      `Safety guard violation: Attempted to reset database while DB_NAME is '${process.env.DB_NAME}'. Must be 'inventory_test_db'.`
    );
  }

  if (!isSchemaInitialized) {
    await setupDatabase();
  }

  // Fetch all user application tables in public schema once and cache
  if (!cachedTableTruncateSql) {
    const { rows } = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename NOT IN ('SequelizeMeta', 'drizzle_migrations')
    `);

    const tables = (rows as Array<{ tablename: string }>)
      .map((r) => `"${r.tablename}"`)
      .join(", ");

    if (tables.length > 0) {
      cachedTableTruncateSql = `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`;
    }
  }

  if (cachedTableTruncateSql) {
    await pool.query(cachedTableTruncateSql);
  }

  // Explicitly reset all database sequences to 1 (including custom sequences like sales_order_seq)
  await pool.query(`
    SELECT setval('"' || relname || '"', 1, false)
    FROM pg_class
    WHERE relkind = 'S';
  `);
}

export { pool };

