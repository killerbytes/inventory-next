#!/usr/bin/env node
/**
 * Reusable Database Dump Parity Verification Script
 *
 * Usage:
 *   node scripts/verify-db-dump.cjs [dump_file] [options]
 *
 * Options:
 *   --env=<development|production|test>   (default: development)
 *   --tables=<table1,table2,...>          (default: 9 key inventory tables)
 *   --strict-dates                        (count date/timestamp drifts as errors)
 *   --epsilon=<number>                    (numeric comparison tolerance, default: 0.0001)
 *   --json                                (output results as JSON)
 *
 * Example:
 *   node scripts/verify-db-dump.cjs backups/railway-full-2026-10-10T10-48-46-970Z.dump
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const pg = require("pg");

// Parse CLI flags
const args = process.argv.slice(2);
let dumpFileArg = null;
let envName = "development";
let tablesArg = null;
let strictDates = false;
let epsilon = 0.0001;
let jsonOutput = false;
let matchBy = "business"; // "business" | "id"

for (const arg of args) {
  if (arg.startsWith("--env=")) {
    envName = arg.split("=")[1];
  } else if (arg.startsWith("--tables=")) {
    tablesArg = arg.split("=")[1].split(",").map((s) => s.trim());
  } else if (arg === "--strict-dates") {
    strictDates = true;
  } else if (arg.startsWith("--epsilon=")) {
    epsilon = parseFloat(arg.split("=")[1]) || 0.0001;
  } else if (arg === "--json") {
    jsonOutput = true;
  } else if (arg.startsWith("--match-by=")) {
    matchBy = arg.split("=")[1];
  } else if (!arg.startsWith("--") && !dumpFileArg) {
    dumpFileArg = arg;
  }
}

// Load appropriate .env file
const envFile = path.resolve(process.cwd(), `.env.${envName}`);
if (fs.existsSync(envFile)) {
  require("dotenv").config({ path: envFile });
} else {
  require("dotenv").config();
}

const {
  DB_HOST = "localhost",
  DB_USERNAME = "postgres",
  DB_PASSWORD = "killer",
  DB_NAME = "inventory_db",
  DB_PORT = 5432,
  DB_SSL,
} = process.env;

// Resolve dump file
let dumpPath = dumpFileArg;
if (!dumpPath) {
  // Search for latest dump in backups/
  const backupDir = path.resolve(process.cwd(), "backups");
  if (fs.existsSync(backupDir)) {
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => /\.(dump|sql)$/.test(f))
      .map((f) => ({
        name: f,
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);
    if (files.length > 0) {
      dumpPath = path.join(backupDir, files[0].name);
    }
  }
}

if (!dumpPath || !fs.existsSync(dumpPath)) {
  console.error(`Error: Dump file not found: ${dumpPath}`);
  process.exit(1);
}

// Default requested tables to compare
const DEFAULT_TABLES = [
  "Inventories",
  "GoodReceipts",
  "GoodReceiptLines",
  "SalesOrders",
  "SalesOrderItems",
  "ReturnTransactions",
  "ReturnItems",
  "PriceHistories",
  "InventoryMovements",
];

const targetTables = tablesArg || DEFAULT_TABLES;

const DATE_COLUMNS = new Set([
  "createdat",
  "updatedat",
  "deletedat",
  "changedat",
  "receiptdate",
  "orderdate",
  "duedate",
  "deliverydate",
  "returndate",
]);

const NUMERIC_COLUMNS = new Set([
  "quantity",
  "averageprice",
  "totalamount",
  "purchaseprice",
  "originalprice",
  "costperunit",
  "totalcost",
  "totalreturnamount",
  "totalexchangeamount",
  "paymentdifference",
  "unitprice",
  "price",
  "fromprice",
  "toprice",
  "discount",
  "conversionfactor",
  "reorderlevel",
]);

function isDateColumn(columnName) {
  const lower = columnName.toLowerCase();
  return DATE_COLUMNS.has(lower) || lower.endsWith("date") || lower.endsWith("at");
}

function isNumericColumn(columnName) {
  return NUMERIC_COLUMNS.has(columnName.toLowerCase());
}

function parsePgCopyStream(rawText) {
  const lines = rawText.split(/\r?\n/);
  let columns = [];
  let inDataSection = false;
  const rows = [];

  for (const line of lines) {
    if (!inDataSection) {
      if (line.startsWith("COPY ")) {
        const colMatch = line.match(/\((.*?)\)\s+FROM\s+stdin;/i);
        if (colMatch && colMatch[1]) {
          columns = colMatch[1]
            .split(",")
            .map((c) => c.trim().replace(/^"/, "").replace(/"$/, ""));
          inDataSection = true;
        }
      }
      continue;
    }

    if (line.startsWith("\\.")) {
      inDataSection = false;
      break;
    }

    if (line.trim().length === 0) continue;

    const parts = line.split("\t");
    const row = {};

    for (let i = 0; i < columns.length; i++) {
      const colName = columns[i];
      let val = parts[i];

      if (val === "\\N" || val === undefined) {
        row[colName] = null;
      } else {
        val = val
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\\\/g, "\\");
        row[colName] = val;
      }
    }

    rows.push(row);
  }

  return rows;
}

function normalizeValue(val, columnName) {
  if (val === null || val === undefined || val === "\\N") {
    return null;
  }

  // Handle Booleans
  if (val === "t" || val === "true" || val === true) return true;
  if (val === "f" || val === "false" || val === false) return false;

  // Handle Dates
  if (isDateColumn(columnName)) {
    if (val instanceof Date) {
      return val.getTime();
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
    return String(val).trim();
  }

  // Handle JSON objects or JSON strings
  const canonicalizeJson = (obj) => {
    const sortKeys = (item) => {
      if (typeof item !== "object" || item === null) return item;
      if (Array.isArray(item)) return item.map(sortKeys);
      return Object.keys(item)
        .sort()
        .reduce((acc, k) => {
          acc[k] = sortKeys(item[k]);
          return acc;
        }, {});
    };
    return JSON.stringify(sortKeys(obj));
  };

  if (typeof val === "object" && val !== null) {
    try {
      return canonicalizeJson(val);
    } catch {
      return val;
    }
  }
  if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
    try {
      return canonicalizeJson(JSON.parse(val));
    } catch {
      // not json, continue
    }
  }

  // Handle Numerics
  if (isNumericColumn(columnName) || (typeof val === "string" && /^-?\d+(\.\d+)?$/.test(val.trim()))) {
    const num = Number(val);
    if (!isNaN(num)) {
      return num;
    }
  }

  if (typeof val === "string") {
    return val.trim();
  }

  return val;
}

function compareFieldValues(dumpVal, dbVal, columnName, eps) {
  const normDump = normalizeValue(dumpVal, columnName);
  const normDb = normalizeValue(dbVal, columnName);

  if (normDump === null && normDb === null) {
    return { isMatch: true, isDateDiff: false, normDump, normDb };
  }
  if ((normDump === "" && normDb === null) || (normDump === null && normDb === "")) {
    return { isMatch: true, isDateDiff: false, normDump, normDb };
  }
  if (normDump === null || normDb === null) {
    return { isMatch: false, isDateDiff: isDateColumn(columnName), normDump, normDb };
  }

  if (isDateColumn(columnName)) {
    const isMatch = normDump === normDb;
    return { isMatch, isDateDiff: !isMatch, normDump, normDb };
  }

  if (typeof normDump === "number" && typeof normDb === "number") {
    const diff = Math.abs(normDump - normDb);
    const isMatch = diff <= eps;
    return { isMatch, isDateDiff: false, normDump, normDb };
  }

  const isMatch = normDump === normDb;
  return { isMatch, isDateDiff: false, normDump, normDb };
}

function compareTableData(tableName, dumpRows, dbRows, options = {}) {
  const keyColumn = options.keyColumn || "id";
  const ignoreDateDiffs = options.ignoreDateDiffs ?? true;
  const eps = options.epsilon ?? 0.0001;

  const getKey = (row, isDump) => {
    if (options.keyResolver) {
      return String(options.keyResolver(row, isDump) ?? "");
    }
    return String(row[keyColumn] ?? "");
  };

  const dumpMap = new Map();
  for (const row of dumpRows) {
    const key = getKey(row, true);
    if (key) dumpMap.set(key, row);
  }

  const dbMap = new Map();
  for (const row of dbRows) {
    const key = getKey(row, false);
    if (key) dbMap.set(key, row);
  }

  const dumpOnlyKeys = [];
  const dbOnlyKeys = [];
  const valueMismatches = [];
  const dateDrifts = [];

  let columns = options.columnsToCompare;
  if (!columns || columns.length === 0) {
    const dumpCols = dumpRows.length > 0 ? Object.keys(dumpRows[0]) : [];
    const dbCols = dbRows.length > 0 ? Object.keys(dbRows[0]) : [];
    const commonCols = dumpCols.filter((c) => dbCols.includes(c));
    columns = commonCols.length > 0 ? commonCols : dumpCols;
  }

  for (const [key, dRow] of dumpMap.entries()) {
    const dbRow = dbMap.get(key);
    if (!dbRow) {
      dumpOnlyKeys.push(key);
      continue;
    }

    for (const col of columns) {
      if (
        col === keyColumn ||
        (options.keyResolver && col === "id") ||
        (options.ignoredColumns && options.ignoredColumns.has(col))
      ) {
        continue;
      }

      const { isMatch, isDateDiff, normDump, normDb } = compareFieldValues(
        dRow[col],
        dbRow[col],
        col,
        eps
      );

      if (!isMatch) {
        if (isDateDiff) {
          dateDrifts.push({
            key,
            column: col,
            dumpDate: dRow[col],
            dbDate: dbRow[col],
          });
          if (!ignoreDateDiffs) {
            valueMismatches.push({
              key,
              column: col,
              dumpValue: normDump,
              dbValue: normDb,
            });
          }
        } else {
          valueMismatches.push({
            key,
            column: col,
            dumpValue: normDump,
            dbValue: normDb,
          });
        }
      }
    }
  }

  for (const key of dbMap.keys()) {
    if (!dumpMap.has(key)) {
      dbOnlyKeys.push(key);
    }
  }

  let status = "MATCH";
  if (valueMismatches.length > 0) {
    status = "DRIFT";
  } else if (dumpOnlyKeys.length > 0 || dbOnlyKeys.length > 0) {
    status = "ROW_COUNT_MISMATCH";
  }

  return {
    tableName,
    status,
    dumpRowCount: dumpRows.length,
    dbRowCount: dbRows.length,
    sharedCount: dumpRows.length - dumpOnlyKeys.length,
    dumpOnlyCount: dumpOnlyKeys.length,
    dbOnlyCount: dbOnlyKeys.length,
    dumpOnlyKeys,
    dbOnlyKeys,
    valueMismatches,
    dateDrifts,
  };
}

async function run() {
  if (!jsonOutput) {
    console.log(`\n================================================================================`);
    console.log(`                   DATABASE DUMP PARITY VERIFIER                                `);
    console.log(`================================================================================`);
    console.log(`Dump File   : ${dumpPath}`);
    console.log(`Target DB   : ${DB_NAME} on ${DB_HOST}:${DB_PORT} (env: ${envName})`);
    console.log(`Tolerance   : epsilon=${epsilon}, strictDates=${strictDates}`);
    console.log(`Match Mode  : ${matchBy.toUpperCase()} (Business Keys: salesOrderNumber, referenceNo, referenceType+Id)`);
    console.log(`Tables      : ${targetTables.join(", ")}`);
    console.log(`--------------------------------------------------------------------------------\n`);
  }

  // Connect to PostgreSQL target database
  const client = new pg.Client({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  const results = [];

  const dumpGrIdToRef = new Map();
  const dbGrIdToRef = new Map();
  const dumpSoIdToNumber = new Map();
  const dbSoIdToNumber = new Map();

  for (const tableName of targetTables) {
    if (!jsonOutput) {
      process.stdout.write(`Analyzing table '${tableName}'... `);
    }

    // 1. Extract table data from dump using pg_restore
    let dumpRows = [];
    try {
      const dumpRaw = execSync(
        `pg_restore -t "${tableName}" --data-only -f - "${dumpPath}"`,
        { maxBuffer: 150 * 1024 * 1024 }
      ).toString();
      dumpRows = parsePgCopyStream(dumpRaw);
    } catch (err) {
      if (!jsonOutput) {
        console.log(`[SKIPPED - Table not in dump or pg_restore error]`);
      }
      continue;
    }

    // 2. Query target table from DB
    let dbRows = [];
    try {
      const queryRes = await client.query(`SELECT * FROM "${tableName}";`);
      dbRows = queryRes.rows;
    } catch (err) {
      if (!jsonOutput) {
        console.log(`[SKIPPED - Table not in target DB: ${err.message}]`);
      }
      continue;
    }

    // Populate lookup maps if parent tables are processed
    if (tableName === "GoodReceipts") {
      dumpRows.forEach((r) => dumpGrIdToRef.set(String(r.id), String(r.referenceNo)));
      dbRows.forEach((r) => dbGrIdToRef.set(String(r.id), String(r.referenceNo)));
    } else if (tableName === "SalesOrders") {
      dumpRows.forEach((r) => dumpSoIdToNumber.set(String(r.id), String(r.salesOrderNumber)));
      dbRows.forEach((r) => dbSoIdToNumber.set(String(r.id), String(r.salesOrderNumber)));
    }

    // Lazy load parent maps if child table is processed standalone
    if (matchBy === "business" && tableName === "GoodReceiptLines" && dumpGrIdToRef.size === 0) {
      try {
        const raw = execSync(`pg_restore -t "GoodReceipts" --data-only -f - "${dumpPath}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();
        parsePgCopyStream(raw).forEach((r) => dumpGrIdToRef.set(String(r.id), String(r.referenceNo)));
        const res = await client.query(`SELECT id, "referenceNo" FROM "GoodReceipts";`);
        res.rows.forEach((r) => dbGrIdToRef.set(String(r.id), String(r.referenceNo)));
      } catch {}
    }
    if (matchBy === "business" && tableName === "SalesOrderItems" && dumpSoIdToNumber.size === 0) {
      try {
        const raw = execSync(`pg_restore -t "SalesOrders" --data-only -f - "${dumpPath}"`, { maxBuffer: 50 * 1024 * 1024 }).toString();
        parsePgCopyStream(raw).forEach((r) => dumpSoIdToNumber.set(String(r.id), String(r.salesOrderNumber)));
        const res = await client.query(`SELECT id, "salesOrderNumber" FROM "SalesOrders";`);
        res.rows.forEach((r) => dbSoIdToNumber.set(String(r.id), String(r.salesOrderNumber)));
      } catch {}
    }

    // Resolve key strategy
    let keyResolver = null;
    let keyColumn = "id";
    const ignoredColumns = new Set();

    if (matchBy === "business") {
      if (tableName === "Inventories") {
        keyResolver = (r) => String(r.combinationId);
      } else if (tableName === "GoodReceipts") {
        keyResolver = (r) => String(r.referenceNo);
      } else if (tableName === "GoodReceiptLines") {
        ignoredColumns.add("goodReceiptId");
        keyResolver = (r, isDump) => {
          const map = isDump ? dumpGrIdToRef : dbGrIdToRef;
          const ref = map.get(String(r.goodReceiptId)) || r.goodReceiptId;
          return `${ref}:${r.combinationId}`;
        };
      } else if (tableName === "SalesOrders") {
        keyResolver = (r) => String(r.salesOrderNumber);
      } else if (tableName === "SalesOrderItems") {
        ignoredColumns.add("salesOrderId");
        keyResolver = (r, isDump) => {
          const map = isDump ? dumpSoIdToNumber : dbSoIdToNumber;
          const son = map.get(String(r.salesOrderId)) || r.salesOrderId;
          return `${son}:${r.combinationId}`;
        };
      } else if (tableName === "InventoryMovements") {
        ignoredColumns.add("referenceId");
        keyResolver = (r, isDump) => {
          let parentRef = r.referenceId;
          if (r.referenceType === "SALES_ORDER") {
            const map = isDump ? dumpSoIdToNumber : dbSoIdToNumber;
            parentRef = map.get(String(r.referenceId)) || r.referenceId;
          } else if (r.referenceType === "GOOD_RECEIPT") {
            const map = isDump ? dumpGrIdToRef : dbGrIdToRef;
            parentRef = map.get(String(r.referenceId)) || r.referenceId;
          }
          return `${r.referenceType || "NONE"}:${parentRef || "NONE"}:${r.combinationId || "NONE"}:${r.type || "NONE"}`;
        };
      }
    }

    // 3. Compare data
    const result = compareTableData(tableName, dumpRows, dbRows, {
      keyColumn,
      keyResolver,
      ignoredColumns,
      ignoreDateDiffs: !strictDates,
      epsilon,
    });

    results.push(result);

    if (!jsonOutput) {
      const badge =
        result.status === "MATCH"
          ? "MATCH (OK)"
          : result.status === "DRIFT"
          ? `VALUE DRIFT (${result.valueMismatches.length} diffs)`
          : `ROW DELTA (Dump: ${result.dumpRowCount}, DB: ${result.dbRowCount})`;
      console.log(`[${badge}]`);
    }
  }

  await client.end();

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  // Print Summary Table
  console.log(`\n================================================================================`);
  console.log(`                             PARITY SUMMARY TABLE                               `);
  console.log(`================================================================================`);
  console.log(
    [
      "Table".padEnd(22),
      "Status".padEnd(16),
      "Dump Rows".padEnd(11),
      "DB Rows".padEnd(11),
      "Dump Only".padEnd(11),
      "DB Only".padEnd(9),
      "Value Diffs",
    ].join("")
  );
  console.log(`--------------------------------------------------------------------------------`);

  for (const r of results) {
    const statusLabel =
      r.status === "MATCH" ? "MATCH" : r.status === "DRIFT" ? "VALUE DRIFT" : "ROW DELTA";
    console.log(
      [
        r.tableName.padEnd(22),
        statusLabel.padEnd(16),
        String(r.dumpRowCount).padEnd(11),
        String(r.dbRowCount).padEnd(11),
        String(r.dumpOnlyCount).padEnd(11),
        String(r.dbOnlyCount).padEnd(9),
        String(r.valueMismatches.length),
      ].join("")
    );
  }
  console.log(`================================================================================`);

  // Print value mismatch details
  const valueDrifts = results.filter((r) => r.valueMismatches.length > 0);
  if (valueDrifts.length > 0) {
    console.log(`\n--- VALUE MISMATCH DETAILS ---`);
    for (const r of valueDrifts) {
      console.log(`\n[${r.tableName}] Total Value Mismatches: ${r.valueMismatches.length}`);
      const samples = r.valueMismatches.slice(0, 10);
      for (const m of samples) {
        console.log(
          `  - Row #${m.key} -> Column '${m.column}': Dump=${JSON.stringify(m.dumpValue)} | DB=${JSON.stringify(m.dbValue)}`
        );
      }
      if (r.valueMismatches.length > 10) {
        console.log(`  ... and ${r.valueMismatches.length - 10} more value mismatches.`);
      }
    }
  }

  // Print row delta details
  const rowDeltas = results.filter((r) => r.dumpOnlyCount > 0 || r.dbOnlyCount > 0);
  if (rowDeltas.length > 0) {
    console.log(`\n--- ROW ADDITIONS / REMOVALS ---`);
    for (const r of rowDeltas) {
      console.log(`\n[${r.tableName}] Shared: ${r.sharedCount} | Dump-Only: ${r.dumpOnlyCount} | DB-Only: ${r.dbOnlyCount}`);
      if (r.dumpOnlyKeys.length > 0) {
        console.log(`  - Sample IDs present in Dump but missing in DB: ${r.dumpOnlyKeys.slice(0, 8).join(", ")}${r.dumpOnlyKeys.length > 8 ? "..." : ""}`);
      }
      if (r.dbOnlyKeys.length > 0) {
        console.log(`  - Sample IDs present in DB but missing in Dump: ${r.dbOnlyKeys.slice(0, 8).join(", ")}${r.dbOnlyKeys.length > 8 ? "..." : ""}`);
      }
    }
  }

  // Print date drifts summary
  const dateDriftTables = results.filter((r) => r.dateDrifts.length > 0);
  if (dateDriftTables.length > 0 && !strictDates) {
    console.log(`\n--- DATE / TIMESTAMP DRIFTS (Filtered by --strict-dates=false) ---`);
    for (const r of dateDriftTables) {
      console.log(`  - [${r.tableName}] has ${r.dateDrifts.length} rows with timestamp/date offsets between dump and DB.`);
    }
  }

  console.log(`\nParity check completed.\n`);
}

run().catch((err) => {
  console.error("Fatal error during parity verification:", err);
  process.exit(1);
});
