import sequelize from "@/server/db/sequelize";

/**
 * Setup database connection for integration tests.
 */
export async function setupDatabase(): Promise<void> {
  if (process.env.DB_NAME !== "inventory_test_db") {
    throw new Error(
      `Safety guard violation: Tests must run against 'inventory_test_db', but current DB_NAME is '${process.env.DB_NAME}'. Aborting.`
    );
  }
  await sequelize.authenticate();
}

/**
 * Reset database schema (drop and recreate tables).
 * Strictly enforced to only operate on 'inventory_test_db'.
 */
export async function resetDatabase(): Promise<void> {
  if (process.env.DB_NAME !== "inventory_test_db") {
    throw new Error(
      `Safety guard violation: Attempted to reset database while DB_NAME is '${process.env.DB_NAME}'. Must be 'inventory_test_db'.`
    );
  }
  await sequelize.sync({ force: true });
  // Ensure schema matches migrations (e.g. search_text TSVECTOR for full-text search)
  await sequelize.query(`
    ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS search_text TSVECTOR DEFAULT ''::tsvector;
    CREATE INDEX IF NOT EXISTS idx_products_search_text ON "Products" USING GIN (search_text);
  `);
}

export { sequelize };
