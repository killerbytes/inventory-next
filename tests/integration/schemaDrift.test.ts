import { is } from "drizzle-orm";
import { getTableConfig, PgDialect, PgTable } from "drizzle-orm/pg-core";
import * as schema from "@/server/db/schema";
import { pool, setupDatabase } from "../setup";

/**
 * Guard: the Drizzle schema in src/server/db/schema must describe the real database.
 *
 * In CI the database is built from tests/db/schema.sql (production's structure), so
 * this fails whenever the code drifts from production. Drift is dangerous because a
 * migration generated from drifted code would drop or rewrite production structure,
 * and mismatched types misbehave at runtime (e.g. timestamptz declared as timestamp
 * reads back shifted by the DB session's UTC offset).
 *
 * Code-only defaults belong in `$defaultFn` (applied by Drizzle, not part of the DB),
 * so `.default()` / `.defaultNow()` must match a real DB default.
 */

/** Present in the DB but intentionally not modelled. */
const UNMODELLED_TABLES = new Set(["SequelizeMeta"]);

const FK_ACTION: Record<string, string> = {
  a: "no action",
  r: "restrict",
  c: "cascade",
  n: "set null",
  d: "set default",
};

/** Normalizes Drizzle's SQL type names to Postgres's format_type() output. */
function normalizeCodeType(sqlType: string): string {
  return sqlType
    .replace(/^serial$/, "integer")
    .replace(/^varchar\((\d+)\)$/, "character varying($1)")
    .replace(/^varchar$/, "character varying")
    .replace(/^numeric\((\d+), ?(\d+)\)$/, "numeric($1,$2)")
    .replace(/^timestamp$/, "timestamp without time zone")
    .replace(/^timestamp\((\d)\)$/, "timestamp($1) without time zone");
}

const dialect = new PgDialect();

/** Compares partial-index predicates loosely: ("deletedAt" IS NULL) == "Table"."deletedAt" is null. */
function normalizePredicate(pred: string | null | undefined): string {
  if (!pred) return "";
  return pred.replace(/"[A-Za-z]+"\./g, "").replace(/[()"\s]/g, "").toLowerCase();
}

const codePredicate = (where: unknown) =>
  where ? normalizePredicate(dialect.sqlToQuery(where as any).sql) : "";

type DbColumn = { type: string; notNull: boolean; default: string | null };

async function loadDatabase() {
  const columns = await pool.query(`
    SELECT c.relname AS tbl, a.attname AS col, format_type(a.atttypid, a.atttypmod) AS type,
           a.attnotnull AS not_null, pg_get_expr(d.adbin, d.adrelid) AS dflt
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped`);

  const colNames = (rel: string, keys: string) =>
    // ::text because node-postgres returns name[] as an unparsed "{a,b}" string.
    `ARRAY(SELECT a.attname::text FROM unnest(${keys}) WITH ORDINALITY k(num, ord)
           JOIN pg_attribute a ON a.attrelid = ${rel} AND a.attnum = k.num ORDER BY k.ord)`;

  const fks = await pool.query(`
    SELECT cl.relname AS tbl, con.conname AS name, ${colNames("con.conrelid", "con.conkey")} AS cols,
           fcl.relname AS ftbl, ${colNames("con.confrelid", "con.confkey")} AS fcols,
           con.confdeltype AS on_delete, con.confupdtype AS on_update
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_class fcl ON fcl.oid = con.confrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE con.contype = 'f' AND n.nspname = 'public'`);

  const indexes = await pool.query(`
    SELECT cl.relname AS tbl, ic.relname AS name, ix.indisunique AS is_unique, am.amname AS method,
           pg_get_expr(ix.indpred, ix.indrelid) AS pred,
           ${colNames("ix.indrelid", "ix.indkey::int2[]")} AS cols
    FROM pg_index ix
    JOIN pg_class cl ON cl.oid = ix.indrelid
    JOIN pg_class ic ON ic.oid = ix.indexrelid
    JOIN pg_am am ON am.oid = ic.relam
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'public' AND NOT ix.indisprimary AND 0 <> ALL (ix.indkey::int2[])`);

  const tables = new Map<string, Map<string, DbColumn>>();
  for (const r of columns.rows) {
    if (!tables.has(r.tbl)) tables.set(r.tbl, new Map());
    tables.get(r.tbl)!.set(r.col, { type: r.type, notNull: r.not_null, default: r.dflt });
  }
  return { tables, fks: fks.rows, indexes: indexes.rows };
}

function loadCode() {
  return Object.values(schema)
    .filter((value) => is(value, PgTable))
    .map((table) => getTableConfig(table as PgTable));
}

describe("schema drift guard (code vs database)", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  it("src/server/db/schema matches the database exactly", async () => {
    const db = await loadDatabase();
    const code = loadCode();
    const problems: string[] = [];
    const codeTableNames = new Set(code.map((t) => t.name));

    for (const name of db.tables.keys()) {
      if (!codeTableNames.has(name) && !UNMODELLED_TABLES.has(name)) {
        // Extra local-only tables are tolerated; CI's DB is built from production's structure.
        if (process.env.CI) problems.push(`${name}: table exists in DB but is not modelled`);
      }
    }

    for (const t of code) {
      const dbCols = db.tables.get(t.name);
      if (!dbCols) {
        problems.push(`${t.name}: table is modelled in code but missing from DB`);
        continue;
      }

      for (const [col, dc] of dbCols) {
        const cc = t.columns.find((c) => c.name === col);
        if (!cc) {
          problems.push(`${t.name}.${col}: column exists in DB but not in code (${dc.type})`);
          continue;
        }
        const codeType = normalizeCodeType(cc.getSQLType());
        if (codeType !== dc.type) problems.push(`${t.name}.${col}: type code ${codeType} / db ${dc.type}`);
        if (cc.notNull !== dc.notNull) {
          problems.push(`${t.name}.${col}: code ${cc.notNull ? "NOT NULL" : "nullable"} / db ${dc.notNull ? "NOT NULL" : "nullable"}`);
        }
        const codeSqlDefault = cc.default !== undefined || cc.columnType === "PgSerial";
        const dbDefault = dc.default !== null;
        if (codeSqlDefault !== dbDefault) {
          problems.push(
            `${t.name}.${col}: ${codeSqlDefault ? "code .default() but DB has none (use $defaultFn)" : `DB default ${dc.default} missing in code`}`,
          );
        }
      }
      for (const cc of t.columns) {
        if (!dbCols.has(cc.name)) problems.push(`${t.name}.${cc.name}: column in code but missing from DB`);
      }

      // Names matter: a migration generated later would otherwise drop and recreate each constraint.
      const sig = (name: string, cols: string[], ftbl: string, fcols: string[], del: string, upd: string) =>
        `${name}: ${cols.join(",")} -> ${ftbl}(${fcols.join(",")}) on delete ${del} on update ${upd}`;
      const dbFks = new Set(
        db.fks
          .filter((f) => f.tbl === t.name)
          .map((f) => sig(f.name, f.cols, f.ftbl, f.fcols, FK_ACTION[f.on_delete], FK_ACTION[f.on_update])),
      );
      const codeFks = new Set(
        t.foreignKeys.map((fk) => {
          const ref = fk.reference();
          return sig(
            fk.getName(),
            ref.columns.map((c) => c.name),
            getTableConfig(ref.foreignTable).name,
            ref.foreignColumns.map((c) => c.name),
            fk.onDelete ?? "no action",
            fk.onUpdate ?? "no action",
          );
        }),
      );
      for (const f of dbFks) if (!codeFks.has(f)) problems.push(`${t.name}: FK in DB but not in code: ${f}`);
      for (const f of codeFks) if (!dbFks.has(f)) problems.push(`${t.name}: FK in code but not in DB: ${f}`);

      const dbIdx = db.indexes.filter((i) => i.tbl === t.name);
      const where = (p: string) => (p ? ` where ${p}` : "");
      const dbUnique = new Set(
        dbIdx
          .filter((i) => i.is_unique)
          .map((i) => `${i.name}(${i.cols.join(",")})${where(normalizePredicate(i.pred))}`),
      );
      const codeUnique = new Set([
        ...t.columns.filter((c) => c.isUnique).map((c) => `${c.uniqueName}(${c.name})`),
        ...t.uniqueConstraints.map((u) => `${u.getName()}(${u.columns.map((c) => c.name).join(",")})`),
        ...t.indexes
          .filter((i) => i.config.unique)
          .map((i) => `${i.config.name}(${i.config.columns.map((c: any) => c.name).join(",")})${where(codePredicate(i.config.where))}`),
      ]);
      for (const u of dbUnique) if (!codeUnique.has(u)) problems.push(`${t.name}: UNIQUE ${u} in DB but not in code`);
      for (const u of codeUnique) if (!dbUnique.has(u)) problems.push(`${t.name}: UNIQUE ${u} in code but not in DB`);

      const idxSig = (name: string, cols: string[], method: string) => `${name}(${cols.join(",")} using ${method})`;
      const dbPlain = new Set(dbIdx.filter((i) => !i.is_unique).map((i) => idxSig(i.name, i.cols, i.method)));
      const codePlain = new Set(
        t.indexes
          .filter((i) => !i.config.unique)
          .map((i) => idxSig(i.config.name!, i.config.columns.map((c: any) => c.name), i.config.method ?? "btree")),
      );
      for (const i of dbPlain) if (!codePlain.has(i)) problems.push(`${t.name}: INDEX ${i} in DB but not in code`);
      for (const i of codePlain) if (!dbPlain.has(i)) problems.push(`${t.name}: INDEX ${i} in code but not in DB`);
    }

    expect(problems.sort()).toEqual([]);
  });
});
