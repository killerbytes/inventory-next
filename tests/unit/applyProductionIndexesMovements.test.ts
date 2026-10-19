import { describe, expect, it } from "vitest";

// Import script module definitions and invariant helpers
const script = require("../../scripts/apply-production-indexes-movements.cjs");

describe("apply-production-indexes-movements Script Invariants (Unit)", () => {
  it("should define all 5 target indexes matching Drizzle schema exactly", () => {
    expect(script.TARGET_INDEXES).toBeDefined();
    expect(script.TARGET_INDEXES.length).toBe(5);

    const indexNames = script.TARGET_INDEXES.map((idx: any) => idx.name);
    expect(indexNames).toContain("idx_inventory_movements_updated_at");
    expect(indexNames).toContain("idx_inventory_movements_combination_id");
    expect(indexNames).toContain("idx_inventory_movements_combo_id_id");
    expect(indexNames).toContain("idx_inventory_movements_type");
    expect(indexNames).toContain("idx_inventory_movements_reference");
  });

  it("should define exact column mappings for each index", () => {
    const map = new Map(script.TARGET_INDEXES.map((idx: any) => [idx.name, idx.columns]));

    expect(map.get("idx_inventory_movements_updated_at")).toEqual(['"updatedAt"']);
    expect(map.get("idx_inventory_movements_combination_id")).toEqual(['"combinationId"']);
    expect(map.get("idx_inventory_movements_combo_id_id")).toEqual(['"combinationId"', '"id"']);
    expect(map.get("idx_inventory_movements_type")).toEqual(['"type"']);
    expect(map.get("idx_inventory_movements_reference")).toEqual(['"referenceType"', '"referenceId"']);
  });

  it("should generate non-blocking CREATE INDEX CONCURRENTLY IF NOT EXISTS DDL statements", () => {
    expect(typeof script.buildIndexStatements).toBe("function");
    const ddlList = script.buildIndexStatements();

    expect(ddlList.length).toBe(5);
    for (const ddl of ddlList) {
      expect(ddl).toMatch(/^CREATE INDEX CONCURRENTLY IF NOT EXISTS/);
      expect(ddl).toContain('ON "InventoryMovements"');
    }

    // Check specific statements
    expect(ddlList).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inventory_movements_updated_at" ON "InventoryMovements" ("updatedAt")'
    );
    expect(ddlList).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inventory_movements_combo_id_id" ON "InventoryMovements" ("combinationId", "id")'
    );
    expect(ddlList).toContain(
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inventory_movements_reference" ON "InventoryMovements" ("referenceType", "referenceId")'
    );
  });

  it("should identify missing indexes against existing pg_indexes records", () => {
    expect(typeof script.filterMissingIndexes).toBe("function");

    const existingRows = [
      { indexname: "InventoryMovements_pkey" },
      { indexname: "idx_inventory_movements_type" },
    ];

    const missing = script.filterMissingIndexes(existingRows);
    expect(missing.length).toBe(4);
    expect(missing.map((m: any) => m.name)).not.toContain("idx_inventory_movements_type");
    expect(missing.map((m: any) => m.name)).toContain("idx_inventory_movements_updated_at");
  });

  describe("resolveDbConfig (Unit)", () => {
    it("should export resolveDbConfig helper function", () => {
      expect(typeof script.resolveDbConfig).toBe("function");
    });

    it("should resolve localhost without SSL for local environment", () => {
      const config = script.resolveDbConfig([]);
      expect(config.host).toBeDefined();
      if (config.host === "localhost" || config.host === "127.0.0.1") {
        expect(config.ssl).toBeUndefined();
      }
    });

    it("should load .env.production and enable SSL when --env=production flag is passed", () => {
      const config = script.resolveDbConfig(["--env=production"]);
      expect(config.host).toBe("tokaido.proxy.rlwy.net");
      expect(config.port).toBe(28803);
      expect(config.database).toBe("railway");
      expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });
  });
});
