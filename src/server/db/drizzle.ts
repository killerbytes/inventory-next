import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import "server-only";
import * as schema from "./schema";
import { resolveDbSsl } from "./ssl";

const { Pool } = pg;

const host = process.env.DB_HOST;
const port = Number(process.env.DB_PORT);
const user = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;
const database = process.env.DB_NAME;

if (!host || !port || !user || !password || !database) {
  throw new Error("Missing database configuration for Drizzle");
}

export const pool = new Pool({
  host,
  port,
  user,
  password,
  database,
  ssl: resolveDbSsl(),
  max: 20,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 30000,
});

export const db = drizzle(pool, { schema });
export default db;
