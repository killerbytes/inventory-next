import { defineConfig } from "drizzle-kit";
import { resolveDbSsl } from "./src/server/db/ssl";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/*",
  out: "./drizzle",
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "killer",
    database: process.env.DB_NAME || "inventory_test_db",
    ssl: resolveDbSsl(),
  },
});
