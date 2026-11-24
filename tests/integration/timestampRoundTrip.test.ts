import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import * as schema from "@/server/db/schema";
import { customers } from "@/server/db/schema/customers";
import { resetDatabase, setupDatabase } from "../setup";

/**
 * The DB stores `timestamp with time zone`. When the code declared those columns as plain
 * `timestamp`, Drizzle dropped the offset: values read back shifted by the session's UTC
 * offset (8 hours on a UTC+8 database) and writes were interpreted in the session zone.
 * Production happened to be safe only because its session TimeZone is UTC.
 *
 * This forces a non-UTC session so the bug would show even on CI's UTC database.
 */
describe("timestamptz columns round-trip exactly, whatever the DB session timezone", () => {
  let pool: pg.Pool;
  let manilaDb: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    await setupDatabase();
    pool = new pg.Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      options: "-c TimeZone=Asia/Manila",
    });
    manilaDb = drizzle(pool, { schema });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("reads back the same instant that was written", async () => {
    const instant = new Date("2026-11-11T05:17:53.391Z"); // 13:17 in Manila

    const [inserted] = await manilaDb
      .insert(customers)
      .values({ name: "TZ Check", createdAt: instant, updatedAt: instant })
      .returning();
    const [row] = await manilaDb.select().from(customers).where(eq(customers.id, inserted.id));

    expect(row.createdAt.toISOString()).toBe(instant.toISOString());
  });

  it("stores the correct instant in the database (independent of how Drizzle reads it)", async () => {
    const instant = new Date("2026-11-11T05:17:53.391Z");

    const [inserted] = await manilaDb
      .insert(customers)
      .values({ name: "TZ Check", createdAt: instant, updatedAt: instant })
      .returning();
    const { rows } = await pool.query<{ epoch_ms: string }>(
      `SELECT (extract(epoch FROM "createdAt") * 1000)::bigint::text AS epoch_ms FROM "Customers" WHERE id = $1`,
      [inserted.id],
    );

    expect(Number(rows[0].epoch_ms)).toBe(instant.getTime());
  });
});
