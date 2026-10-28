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
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_updated_at ON "InventoryMovements" ("updatedAt");
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_combination_id ON "InventoryMovements" ("combinationId");
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_combo_id_id ON "InventoryMovements" ("combinationId", id);
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON "InventoryMovements" ("type");
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON "InventoryMovements" ("referenceType", "referenceId");

      CREATE TABLE IF NOT EXISTS "SalesInvoices" (
        "id" SERIAL PRIMARY KEY,
        "customerId" INTEGER NOT NULL,
        "invoiceNumber" VARCHAR(255) NOT NULL UNIQUE,
        "invoiceDate" TIMESTAMPTZ NOT NULL,
        "dueDate" TIMESTAMPTZ,
        "status" VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
        "previousBalance" NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        "totalCharges" NUMERIC(10, 2) NOT NULL,
        "totalPayments" NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        "amountDue" NUMERIC(10, 2) NOT NULL,
        "notes" TEXT,
        "changedBy" INTEGER DEFAULT 1,
        "createdAt" TIMESTAMPTZ,
        "updatedAt" TIMESTAMPTZ,
        "deletedAt" TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS "SalesInvoiceLines" (
        "id" SERIAL PRIMARY KEY,
        "salesInvoiceId" INTEGER NOT NULL REFERENCES "SalesInvoices"("id") ON DELETE CASCADE,
        "salesOrderId" INTEGER NOT NULL REFERENCES "SalesOrders"("id"),
        "orderDate" TIMESTAMPTZ,
        "refNo" VARCHAR(255),
        "description" TEXT,
        "charges" NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        "payments" NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        "balance" NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        "createdAt" TIMESTAMPTZ,
        "updatedAt" TIMESTAMPTZ,
        "deletedAt" TIMESTAMPTZ
      );
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

