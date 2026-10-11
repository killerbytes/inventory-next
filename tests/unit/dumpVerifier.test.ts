import { describe, it, expect } from "vitest";
import {
  parsePgCopyStream,
  normalizeValue,
  compareTableData,
  formatComparisonReport,
  type TableComparisonOptions,
} from "../../src/server/services/dumpVerifier.service";

describe("dumpVerifier.service", () => {
  describe("parsePgCopyStream", () => {
    it("should correctly parse COPY command columns and tab-separated data", () => {
      const copyText = [
        `COPY public."Inventories" (id, "combinationId", "averagePrice", quantity, "createdAt") FROM stdin;`,
        `1\t101\t9.95\t25.000000\t2025-09-20 02:12:18.413+00`,
        `2\t102\t\\N\t0.000000\t2025-09-21 00:00:00+00`,
        `\\.`,
      ].join("\n");

      const parsed = parsePgCopyStream(copyText);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({
        id: "1",
        combinationId: "101",
        averagePrice: "9.95",
        quantity: "25.000000",
        createdAt: "2025-09-20 02:12:18.413+00",
      });
      expect(parsed[1].averagePrice).toBeNull();
      expect(parsed[1].combinationId).toBe("102");
    });

    it("should handle escaped characters in strings", () => {
      const copyText = [
        `COPY public."GoodReceipts" (id, "referenceNo", "internalNotes") FROM stdin;`,
        `1\tREF-001\tLine 1\\nLine 2\\tTabbed`,
        `\\.`,
      ].join("\n");

      const parsed = parsePgCopyStream(copyText);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].internalNotes).toBe("Line 1\nLine 2\tTabbed");
    });
  });

  describe("normalizeValue", () => {
    it("should consider numeric strings with differing decimal scales as equivalent", () => {
      expect(normalizeValue("25.000000", "quantity")).toEqual(
        normalizeValue(25, "quantity"),
      );
      expect(normalizeValue("9.95", "averagePrice")).toEqual(
        normalizeValue("9.950000", "averagePrice"),
      );
    });

    it("should detect true numeric differences", () => {
      expect(normalizeValue("25.000000", "quantity")).not.toEqual(
        normalizeValue("25.500000", "quantity"),
      );
    });

    it("should normalize timestamps to epoch milliseconds", () => {
      const t1 = normalizeValue("2026-10-10T10:48:46.000Z", "createdAt");
      const t2 = normalizeValue(new Date("2026-10-10T10:48:46.000Z"), "createdAt");
      expect(t1).toBe(t2);
    });

    it("should normalize Postgres boolean strings to booleans", () => {
      expect(normalizeValue("f", "isDelivery")).toBe(false);
      expect(normalizeValue(false, "isDelivery")).toBe(false);
      expect(normalizeValue("t", "isDelivery")).toBe(true);
      expect(normalizeValue(true, "isDelivery")).toBe(true);
    });

    it("should normalize stringified JSON and JSON objects to equivalent representation", () => {
      const jsonStr = '{"Colors":"Silver Red"}';
      const jsonObj = { Colors: "Silver Red" };
      expect(normalizeValue(jsonStr, "variantSnapshot")).toBe(
        normalizeValue(jsonObj, "variantSnapshot"),
      );
    });

    it("should treat JSON with differing key orders as equivalent", () => {
      const json1 = '{"Size":"1/2","Type":"Adapter"}';
      const json2 = '{"Type":"Adapter","Size":"1/2"}';
      expect(normalizeValue(json1, "variantSnapshot")).toBe(
        normalizeValue(json2, "variantSnapshot"),
      );
    });

    it("should consider empty string and null equivalent for text columns", () => {
      const dumpRows = [{ id: "1", discountNote: "" }];
      const dbRows = [{ id: 1, discountNote: null }];
      const res = compareTableData("GoodReceiptLines", dumpRows, dbRows, {
        columnsToCompare: ["discountNote"],
      });
      expect(res.valueMismatches).toHaveLength(0);
    });
  });

  describe("compareTableData", () => {
    it("should report 0 mismatches when dump and DB rows are identical", () => {
      const dumpRows = [
        { id: "1", combinationId: "100", quantity: "20.000000", averagePrice: "15.00" },
        { id: "2", combinationId: "101", quantity: "5.000000", averagePrice: "50.00" },
      ];
      const dbRows = [
        { id: 1, combinationId: 100, quantity: "20", averagePrice: "15" },
        { id: 2, combinationId: 101, quantity: "5.00", averagePrice: "50" },
      ];

      const result = compareTableData("Inventories", dumpRows, dbRows, {
        keyColumn: "id",
        columnsToCompare: ["quantity", "averagePrice"],
      });

      expect(result.status).toBe("MATCH");
      expect(result.dumpRowCount).toBe(2);
      expect(result.dbRowCount).toBe(2);
      expect(result.dumpOnlyCount).toBe(0);
      expect(result.dbOnlyCount).toBe(0);
      expect(result.valueMismatches).toHaveLength(0);
    });

    it("should accurately identify added rows, missing rows, and modified values", () => {
      const dumpRows = [
        { id: "1", combinationId: "100", quantity: "20.000000", averagePrice: "15.00" },
        { id: "2", combinationId: "101", quantity: "5.000000", averagePrice: "50.00" },
      ];
      const dbRows = [
        // id 1 has changed quantity from 20 to 18
        { id: 1, combinationId: 100, quantity: "18.000000", averagePrice: "15.00" },
        // id 2 is missing from DB
        // id 3 is newly added in DB
        { id: 3, combinationId: 102, quantity: "10.000000", averagePrice: "30.00" },
      ];

      const result = compareTableData("Inventories", dumpRows, dbRows, {
        keyColumn: "id",
        columnsToCompare: ["quantity", "averagePrice"],
      });

      expect(result.dumpRowCount).toBe(2);
      expect(result.dbRowCount).toBe(2);
      expect(result.dumpOnlyCount).toBe(1);
      expect(result.dumpOnlyKeys).toContain("2");
      expect(result.dbOnlyCount).toBe(1);
      expect(result.dbOnlyKeys).toContain("3");
      expect(result.valueMismatches).toHaveLength(1);
      expect(result.valueMismatches[0]).toMatchObject({
        key: "1",
        column: "quantity",
        dumpValue: 20,
        dbValue: 18,
      });
    });

    it("should support isolating date differences when ignoreDateDiffs is true", () => {
      const dumpRows = [
        { id: "1", quantity: "10", updatedAt: "2026-10-10T10:00:00Z" },
      ];
      const dbRows = [
        { id: 1, quantity: "10", updatedAt: "2026-10-10T11:00:00Z" },
      ];

      const resultWithIgnore = compareTableData("Inventories", dumpRows, dbRows, {
        keyColumn: "id",
        columnsToCompare: ["quantity", "updatedAt"],
        ignoreDateDiffs: true,
      });

      expect(resultWithIgnore.valueMismatches).toHaveLength(0);
      expect(resultWithIgnore.dateDrifts).toHaveLength(1);

      const resultStrict = compareTableData("Inventories", dumpRows, dbRows, {
        keyColumn: "id",
        columnsToCompare: ["quantity", "updatedAt"],
        ignoreDateDiffs: false,
      });

      expect(resultStrict.valueMismatches).toHaveLength(1);
    });

    it("should support custom keyResolver for matching rows by business key (e.g. salesOrderNumber)", () => {
      // Differing auto-increment IDs, but matching salesOrderNumber
      const dumpRows = [
        { id: "1", salesOrderNumber: "SO-100", totalAmount: "500.00" },
      ];
      const dbRows = [
        { id: 99, salesOrderNumber: "SO-100", totalAmount: "500.00" },
      ];

      const result = compareTableData("SalesOrders", dumpRows, dbRows, {
        keyResolver: (row) => String(row.salesOrderNumber),
        columnsToCompare: ["totalAmount"],
      });

      expect(result.status).toBe("MATCH");
      expect(result.dumpRowCount).toBe(1);
      expect(result.dbRowCount).toBe(1);
      expect(result.dumpOnlyCount).toBe(0);
      expect(result.dbOnlyCount).toBe(0);
      expect(result.valueMismatches).toHaveLength(0);
    });

    it("should support context-aware keyResolver for child tables (e.g. SalesOrderItems)", () => {
      // Child items whose parent order has different IDs between dump and DB
      const dumpItems = [
        { id: "10", salesOrderId: "1", combinationId: "200", quantity: "5" },
      ];
      const dbItems = [
        { id: 999, salesOrderId: "99", combinationId: "200", quantity: "5" },
      ];

      const dumpOrderMap = new Map([["1", "SO-100"]]);
      const dbOrderMap = new Map([["99", "SO-100"]]);

      const result = compareTableData("SalesOrderItems", dumpItems, dbItems, {
        keyResolver: (row, isDump) => {
          const orderMap = isDump ? dumpOrderMap : dbOrderMap;
          const orderNum = orderMap.get(String(row.salesOrderId)) || row.salesOrderId;
          return `${orderNum}:${row.combinationId}`;
        },
        columnsToCompare: ["quantity"],
      });

      expect(result.status).toBe("MATCH");
      expect(result.valueMismatches).toHaveLength(0);
    });
  });

  describe("formatComparisonReport", () => {
    it("should format match and drift tables into a summary report", () => {
      const results = [
        compareTableData("Inventories", [{ id: "1", quantity: "10" }], [{ id: 1, quantity: "10" }]),
        compareTableData(
          "GoodReceipts",
          [{ id: "1", totalAmount: "100.00" }],
          [{ id: 1, totalAmount: "120.00" }],
          { columnsToCompare: ["totalAmount"] },
        ),
      ];

      const report = formatComparisonReport(results);
      expect(report).toContain("DATABASE DUMP PARITY REPORT");
      expect(report).toContain("Inventories");
      expect(report).toContain("MATCH");
      expect(report).toContain("GoodReceipts");
      expect(report).toContain("VALUE DRIFT");
      expect(report).toContain("Total Mismatches: 1");
      expect(report).toContain("Row #1 -> Column 'totalAmount': Dump=100 | DB=120");
    });
  });
});
