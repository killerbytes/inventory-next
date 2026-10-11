/**
 * Database Dump Parity Verification Service
 * Compares PostgreSQL dump exports against active database tables.
 */

export interface ValueMismatch {
  key: string;
  column: string;
  dumpValue: any;
  dbValue: any;
}

export interface DateDrift {
  key: string;
  column: string;
  dumpDate: any;
  dbDate: any;
}

export interface TableComparisonResult {
  tableName: string;
  status: "MATCH" | "DRIFT" | "ROW_COUNT_MISMATCH";
  dumpRowCount: number;
  dbRowCount: number;
  sharedCount: number;
  dumpOnlyCount: number;
  dbOnlyCount: number;
  dumpOnlyKeys: string[];
  dbOnlyKeys: string[];
  valueMismatches: ValueMismatch[];
  dateDrifts: DateDrift[];
}

export interface TableComparisonOptions {
  keyColumn?: string;
  keyResolver?: (row: Record<string, any>, isDump: boolean) => string;
  columnsToCompare?: string[];
  ignoreDateDiffs?: boolean;
  epsilon?: number;
}

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

/**
 * Checks if a column name represents a timestamp/date
 */
export function isDateColumn(columnName: string): boolean {
  const lower = columnName.toLowerCase();
  return DATE_COLUMNS.has(lower) || lower.endsWith("date") || lower.endsWith("at");
}

/**
 * Checks if a column name represents a numeric field
 */
export function isNumericColumn(columnName: string): boolean {
  return NUMERIC_COLUMNS.has(columnName.toLowerCase());
}

/**
 * Parses PostgreSQL COPY FROM stdin stream into an array of row objects
 */
export function parsePgCopyStream(rawText: string): Record<string, any>[] {
  const lines = rawText.split(/\r?\n/);
  let columns: string[] = [];
  let inDataSection = false;
  const rows: Record<string, any>[] = [];

  for (const line of lines) {
    if (!inDataSection) {
      if (line.startsWith("COPY ")) {
        // e.g. COPY public."Inventories" (id, "combinationId", "averagePrice", quantity) FROM stdin;
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
    const row: Record<string, any> = {};

    for (let i = 0; i < columns.length; i++) {
      const colName = columns[i];
      let val: any = parts[i];

      if (val === "\\N" || val === undefined) {
        row[colName] = null;
      } else {
        // Decode common escaped sequences in Postgres COPY format
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

/**
 * Normalizes values across different data types (strings, numeric strings, timestamps)
 */
export function normalizeValue(val: any, columnName: string): any {
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
  const canonicalizeJson = (obj: any): string => {
    const sortKeys = (item: any): any => {
      if (typeof item !== "object" || item === null) return item;
      if (Array.isArray(item)) return item.map(sortKeys);
      return Object.keys(item)
        .sort()
        .reduce((acc: Record<string, any>, k: string) => {
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

/**
 * Compares two field values with type-aware normalization and epsilon tolerance
 */
export function compareFieldValues(
  dumpVal: any,
  dbVal: any,
  columnName: string,
  epsilon = 0.0001,
): { isMatch: boolean; isDateDiff: boolean; normDump: any; normDb: any } {
  const normDump = normalizeValue(dumpVal, columnName);
  const normDb = normalizeValue(dbVal, columnName);

  if (normDump === null && normDb === null) {
    return { isMatch: true, isDateDiff: false, normDump, normDb };
  }
  // Treat empty string and null as equivalent
  if (
    (normDump === "" && normDb === null) ||
    (normDump === null && normDb === "")
  ) {
    return { isMatch: true, isDateDiff: false, normDump, normDb };
  }
  if (normDump === null || normDb === null) {
    return { isMatch: false, isDateDiff: isDateColumn(columnName), normDump, normDb };
  }

  // Handle date columns
  if (isDateColumn(columnName)) {
    const isMatch = normDump === normDb;
    return { isMatch, isDateDiff: !isMatch, normDump, normDb };
  }

  // Compare numerics with epsilon tolerance
  if (typeof normDump === "number" && typeof normDb === "number") {
    const diff = Math.abs(normDump - normDb);
    const isMatch = diff <= epsilon;
    return { isMatch, isDateDiff: false, normDump, normDb };
  }

  return { isMatch, isDateDiff, normDump, normDb };
}

/**
 * Compares dump rows and DB rows for a specific table
 */
export function compareTableData(
  tableName: string,
  dumpRows: Record<string, any>[],
  dbRows: Record<string, any>[],
  options: TableComparisonOptions = {},
): TableComparisonResult {
  const keyColumn = options.keyColumn || "id";
  const ignoreDateDiffs = options.ignoreDateDiffs ?? true;
  const epsilon = options.epsilon ?? 0.0001;

  const getKey = (row: Record<string, any>, isDump: boolean): string => {
    if (options.keyResolver) {
      return String(options.keyResolver(row, isDump) ?? "");
    }
    return String(row[keyColumn] ?? "");
  };

  // Build index for dump rows
  const dumpMap = new Map<string, Record<string, any>>();
  for (const row of dumpRows) {
    const key = getKey(row, true);
    if (key) dumpMap.set(key, row);
  }

  // Build index for DB rows
  const dbMap = new Map<string, Record<string, any>>();
  for (const row of dbRows) {
    const key = getKey(row, false);
    if (key) dbMap.set(key, row);
  }

  const dumpOnlyKeys: string[] = [];
  const dbOnlyKeys: string[] = [];
  const valueMismatches: ValueMismatch[] = [];
  const dateDrifts: DateDrift[] = [];

  // Determine which columns to compare
  let columns = options.columnsToCompare;
  if (!columns || columns.length === 0) {
    const dumpCols = dumpRows.length > 0 ? Object.keys(dumpRows[0]) : [];
    const dbCols = dbRows.length > 0 ? Object.keys(dbRows[0]) : [];
    const commonCols = dumpCols.filter((c) => dbCols.includes(c));
    columns = commonCols.length > 0 ? commonCols : dumpCols;
  }

  // Check for rows only in dump or shared
  for (const [key, dRow] of dumpMap.entries()) {
    const dbRow = dbMap.get(key);
    if (!dbRow) {
      dumpOnlyKeys.push(key);
      continue;
    }

    // Compare each column
    for (const col of columns) {
      if (col === keyColumn || (options.keyResolver && col === "id")) continue;

      const { isMatch, isDateDiff, normDump, normDb } = compareFieldValues(
        dRow[col],
        dbRow[col],
        col,
        epsilon,
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

  // Check for rows only in DB
  for (const key of dbMap.keys()) {
    if (!dumpMap.has(key)) {
      dbOnlyKeys.push(key);
    }
  }

  let status: "MATCH" | "DRIFT" | "ROW_COUNT_MISMATCH" = "MATCH";
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

/**
 * Formats a list of table results into a human-readable text report
 */
export function formatComparisonReport(results: TableComparisonResult[]): string {
  const lines: string[] = [];
  lines.push("================================================================================");
  lines.push("                       DATABASE DUMP PARITY REPORT                              ");
  lines.push("================================================================================");
  lines.push(
    [
      "Table".padEnd(22),
      "Status".padEnd(14),
      "Dump Rows".padEnd(11),
      "DB Rows".padEnd(11),
      "Dump Only".padEnd(11),
      "DB Only".padEnd(9),
      "Diffs",
    ].join(""),
  );
  lines.push("--------------------------------------------------------------------------------");

  for (const r of results) {
    const statusLabel =
      r.status === "MATCH" ? "MATCH" : r.status === "DRIFT" ? "VALUE DRIFT" : "ROW DELTA";
    lines.push(
      [
        r.tableName.padEnd(22),
        statusLabel.padEnd(14),
        String(r.dumpRowCount).padEnd(11),
        String(r.dbRowCount).padEnd(11),
        String(r.dumpOnlyCount).padEnd(11),
        String(r.dbOnlyCount).padEnd(9),
        String(r.valueMismatches.length),
      ].join(""),
    );
  }

  lines.push("================================================================================");

  // Print sample differences for tables with DRIFT
  const driftedTables = results.filter((r) => r.valueMismatches.length > 0);
  if (driftedTables.length > 0) {
    lines.push("\n--- VALUE MISMATCH DETAILS ---");
    for (const r of driftedTables) {
      lines.push(`\n[${r.tableName}] Total Mismatches: ${r.valueMismatches.length}`);
      const samples = r.valueMismatches.slice(0, 5);
      for (const m of samples) {
        lines.push(
          `  - Row #${m.key} -> Column '${m.column}': Dump=${JSON.stringify(m.dumpValue)} | DB=${JSON.stringify(m.dbValue)}`,
        );
      }
      if (r.valueMismatches.length > 5) {
        lines.push(`  ... and ${r.valueMismatches.length - 5} more differences.`);
      }
    }
  }

  return lines.join("\n");
}
