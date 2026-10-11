/**
 * Database sequence utility matching inventory-api src/utils/services/getNextSequence.js 1:1.
 * Executed via PostgreSQL pool without ORM overhead.
 */
import { pool } from "@/server/db/drizzle";

export async function getNextSequence(name: string): Promise<number> {
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS "${name}" START 1;`);
  const result = await pool.query(`SELECT nextval('"${name}"') AS nextval;`);
  const row = result.rows[0];
  return Number(row?.nextval || 1);
}
