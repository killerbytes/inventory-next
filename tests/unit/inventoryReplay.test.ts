import { describe, expect, it } from "vitest";
import {
  simulateProductTimeline,
  generateProductReplayDiff,
  type ReplayTimelineEvent,
  type ReplayCombinationInitialState,
} from "@/server/services/inventoryReplayServer.service";

describe("InventoryReplayServerService (Unit - Chronological Replay Engine)", () => {
  it("should calculate exact moving average cost across sequential Good Receipts", () => {
    // Arrange: 1 SKU (RLS) with 0 initial stock
    const combinations: ReplayCombinationInitialState[] = [
      { id: 1849, sku: "02-XXX-RLS", unit: "RLS", conversionFactor: 1, isBreakPackOfId: null },
    ];

    const events: ReplayTimelineEvent[] = [
      {
        id: 1,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-10-12T07:28:23Z"),
        combinationId: 1849,
        quantity: 10,
        unitCost: 10.0,
      },
      {
        id: 2,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-10-12T07:30:12Z"),
        combinationId: 1849,
        quantity: 10,
        unitCost: 12.0,
      },
    ];

    // Act
    const result = simulateProductTimeline(combinations, events);

    // Assert: (10*10 + 10*12) / 20 = 220 / 20 = 11.00
    const rls = result.combinations.get(1849)!;
    expect(rls.quantity).toBe(20);
    expect(rls.averagePrice).toBe(11.0);
    expect(rls.totalCost).toBe(220.0);
  });

  it("should accurately replay Product 510 scenario (GR -> BP -> GR -> BP)", () => {
    // Arrange: RLS (1849) & PCS (1850) with conversionFactor = 1
    const combinations: ReplayCombinationInitialState[] = [
      { id: 1849, sku: "02-XXX-RLS", unit: "RLS", conversionFactor: 1, isBreakPackOfId: null },
      { id: 1850, sku: "02-XXX-PCS", unit: "PCS", conversionFactor: 1, isBreakPackOfId: 1849 },
    ];

    const events: ReplayTimelineEvent[] = [
      // 1. GR 585: 10 RLS @ 10.00
      {
        id: 1,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-10-12T07:28:23Z"),
        combinationId: 1849,
        quantity: 10,
        unitCost: 10.0,
      },
      // 2. BP 260: 1 RLS -> 1 PCS
      {
        id: 2,
        type: "BREAK_PACK",
        createdAt: new Date("2026-10-12T07:28:41Z"),
        fromCombinationId: 1849,
        toCombinationId: 1850,
        quantity: 1,
        conversionFactor: 1,
      },
      // 3. GR 586: 10 RLS @ 12.00
      {
        id: 3,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-10-12T07:30:12Z"),
        combinationId: 1849,
        quantity: 10,
        unitCost: 12.0,
      },
      // 4. BP 261: 1 RLS -> 1 PCS
      {
        id: 4,
        type: "BREAK_PACK",
        createdAt: new Date("2026-10-12T07:30:24Z"),
        fromCombinationId: 1849,
        toCombinationId: 1850,
        quantity: 1,
        conversionFactor: 1,
      },
    ];

    // Act
    const result = simulateProductTimeline(combinations, events);

    // Assert:
    // RLS: 9 remaining @ 10.00 + 10 incoming @ 12.00 = 210 / 19 = 11.052631 -> 18 left @ 11.0526
    const rls = result.combinations.get(1849)!;
    expect(rls.quantity).toBe(18);
    expect(rls.averagePrice).toBeCloseTo(11.0526, 3);

    // PCS: 1 existing @ 10.00 + 1 incoming @ 11.0526 = 21.0526 / 2 = 10.5263
    const pcs = result.combinations.get(1850)!;
    expect(pcs.quantity).toBe(2);
    expect(pcs.averagePrice).toBeCloseTo(10.5263, 3);

    // Total valuation conservation: 18*11.052631 + 2*10.526316 = 220.00
    expect(rls.totalCost + pcs.totalCost).toBeCloseTo(220.0, 2);
  });

  it("should accurately scale unit cost when conversionFactor > 1 (Product 509 scenario: 1 RLS = 10 PCS)", () => {
    // Arrange: RLS (1847, conversionFactor=10), PCS (1848, conversionFactor=1)
    const combinations: ReplayCombinationInitialState[] = [
      { id: 1847, sku: "01-TES-RLS", unit: "RLS", conversionFactor: 10, isBreakPackOfId: null },
      { id: 1848, sku: "01-TES-PCS", unit: "PCS", conversionFactor: 1, isBreakPackOfId: 1847 },
    ];

    const events: ReplayTimelineEvent[] = [
      // 1. GR 583: 10 RLS @ 10.00
      {
        id: 1,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-10-12T06:52:20Z"),
        combinationId: 1847,
        quantity: 10,
        unitCost: 10.0,
      },
      // 2. BP 252: Break 1 RLS -> 10 PCS @ 1.00 each
      {
        id: 2,
        type: "BREAK_PACK",
        createdAt: new Date("2026-10-12T06:53:01Z"),
        fromCombinationId: 1847,
        toCombinationId: 1848,
        quantity: 1,
        conversionFactor: 10,
      },
      // 3. GR 584: 10 RLS @ 12.00 -> RLS WAC = 11.0526
      {
        id: 3,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-10-12T06:53:42Z"),
        combinationId: 1847,
        quantity: 10,
        unitCost: 12.0,
      },
      // 4. BP 253: Break 1 RLS -> 10 PCS @ (11.0526 / 10 = 1.10526 each)
      {
        id: 4,
        type: "BREAK_PACK",
        createdAt: new Date("2026-10-12T06:54:54Z"),
        fromCombinationId: 1847,
        toCombinationId: 1848,
        quantity: 1,
        conversionFactor: 10,
      },
    ];

    // Act
    const result = simulateProductTimeline(combinations, events);

    // Assert:
    const rls = result.combinations.get(1847)!;
    expect(rls.quantity).toBe(18);
    expect(rls.averagePrice).toBeCloseTo(11.0526, 3);

    // PCS has 10 @ 1.00 + 10 @ 1.10526 = 21.0526 / 20 = 1.05263
    const pcs = result.combinations.get(1848)!;
    expect(pcs.quantity).toBe(20);
    expect(pcs.averagePrice).toBeCloseTo(1.0526, 3);

    // Invariant: 18 * 11.0526315 + 20 * 1.0526315 = 220.00
    expect(rls.totalCost + pcs.totalCost).toBeCloseTo(220.0, 2);
  });

  it("should recompute SalesOrderItems costPrice based on exact point-in-time WAC", () => {
    // Arrange: 1 SKU, 2 GRs and 2 Sales Orders in between
    const combinations: ReplayCombinationInitialState[] = [
      { id: 100, sku: "TEST-SKU", unit: "PCS", conversionFactor: 1, isBreakPackOfId: null },
    ];

    const events: ReplayTimelineEvent[] = [
      // 1. GR 1: 10 PCS @ 10.00
      {
        id: 1,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-10-10T10:00:00Z"),
        combinationId: 100,
        quantity: 10,
        unitCost: 10.0,
      },
      // 2. Sales Order 1: 5 PCS sold (should capture costPrice = 10.00)
      {
        id: 2,
        type: "SALES_ORDER",
        createdAt: new Date("2026-10-11T10:00:00Z"),
        salesOrderItemId: 501,
        combinationId: 100,
        quantity: 5,
        sellingPrice: 20.0,
        recordedCostPrice: 15.0, // Historical error in DB
      },
      // 3. GR 2: 10 PCS @ 16.00 (Stock before: 5 @ 10.00 = 50; Incoming: 10 @ 16.00 = 160; New WAC: 210 / 15 = 14.00)
      {
        id: 3,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-10-12T10:00:00Z"),
        combinationId: 100,
        quantity: 10,
        unitCost: 16.0,
      },
      // 4. Sales Order 2: 5 PCS sold (should capture costPrice = 14.00)
      {
        id: 4,
        type: "SALES_ORDER",
        createdAt: new Date("2026-10-13T10:00:00Z"),
        salesOrderItemId: 502,
        combinationId: 100,
        quantity: 5,
        sellingPrice: 25.0,
        recordedCostPrice: 10.0, // Historical error in DB
      },
    ];

    // Act
    const result = simulateProductTimeline(combinations, events);

    // Assert: SalesOrderItem 501 must be corrected to 10.00, and 502 must be corrected to 14.00
    const so1 = result.salesOrderUpdates.find((s) => s.salesOrderItemId === 501)!;
    expect(so1.recalculatedCostPrice).toBe(10.0);
    expect(so1.costDifference).toBe(-5.0); // 10 - 15 = -5 (COGS dropped by 5, profit increases by 25)

    const so2 = result.salesOrderUpdates.find((s) => s.salesOrderItemId === 502)!;
    expect(so2.recalculatedCostPrice).toBe(14.0);
    expect(so2.costDifference).toBe(4.0); // 14 - 10 = +4 (COGS increased by 4, profit decreases by 20)

    // Final inventory: 15 - 5 = 10 units @ 14.00
    const inv = result.combinations.get(100)!;
    expect(inv.quantity).toBe(10);
    expect(inv.averagePrice).toBe(14.0);
    expect(inv.totalCost).toBe(140.0);
  });

  it("should generate a dry-run diff report highlighting drifted values without DB mutation", () => {
    // Current DB state with wrong average price and wrong cost price
    const currentDbState = {
      productId: 510,
      combinations: [
        { combinationId: 1849, dbAveragePrice: 15.0, dbQuantity: 18 },
        { combinationId: 1850, dbAveragePrice: 12.0, dbQuantity: 2 },
      ],
      salesOrderItems: [
        { id: 999, combinationId: 1849, dbCostPrice: 8.0, quantity: 2, price: 20.0 },
      ],
    };

    const simulatedResult = {
      productId: 510,
      combinations: new Map([
        [1849, { combinationId: 1849, averagePrice: 11.0526, quantity: 18, totalCost: 198.947 }],
        [1850, { combinationId: 1850, averagePrice: 10.5263, quantity: 2, totalCost: 21.053 }],
      ]),
      salesOrderUpdates: [
        {
          salesOrderItemId: 999,
          combinationId: 1849,
          originalCostPrice: 8.0,
          recalculatedCostPrice: 11.0526,
          quantity: 2,
          costDifference: 3.0526,
          profitImpact: -6.1052,
        },
      ],
      movementUpdates: [],
    };

    // Act
    const diff = generateProductReplayDiff(currentDbState, simulatedResult);

    // Assert: Diff captures drifting combinations and drifting sales orders
    expect(diff.hasDrift).toBe(true);
    expect(diff.combinationDrifts.length).toBe(2);
    expect(diff.combinationDrifts[0].combinationId).toBe(1849);
    expect(diff.combinationDrifts[0].diff).toBeCloseTo(11.0526 - 15.0, 3);

    expect(diff.salesOrderDrifts.length).toBe(1);
    expect(diff.salesOrderDrifts[0].salesOrderItemId).toBe(999);
    expect(diff.totalProfitImpact).toBeCloseTo(-6.1052, 3);
  });

  it("should preserve valuation invariant and restore overall WAC upon full RePack", () => {
    // Scenario: 10 units @ 10, 10 units @ 12 = 220 total. All broken to child then all repacked to parent.
    const combinations: ReplayCombinationInitialState[] = [
      { id: 1849, sku: "02-XXX-RLS", unit: "RLS", conversionFactor: 1, isBreakPackOfId: null },
      { id: 1850, sku: "02-XXX-PCS", unit: "PCS", conversionFactor: 1, isBreakPackOfId: 1849 },
    ];

    const events: ReplayTimelineEvent[] = [
      { id: 1, type: "GOOD_RECEIPT", createdAt: new Date("2026-10-12T07:28:00Z"), combinationId: 1849, quantity: 10, unitCost: 10.0 },
      { id: 2, type: "GOOD_RECEIPT", createdAt: new Date("2026-10-12T07:29:00Z"), combinationId: 1849, quantity: 10, unitCost: 12.0 },
      // Break all 20 RLS to PCS
      { id: 3, type: "BREAK_PACK", createdAt: new Date("2026-10-12T07:30:00Z"), fromCombinationId: 1849, toCombinationId: 1850, quantity: 20, conversionFactor: 1 },
      // Repack all 20 PCS back to RLS
      { id: 4, type: "RE_PACK", createdAt: new Date("2026-10-12T07:31:00Z"), fromCombinationId: 1850, toCombinationId: 1849, quantity: 20, conversionFactor: 1 },
    ];

    const result = simulateProductTimeline(combinations, events);
    const rls = result.combinations.get(1849)!;
    const pcs = result.combinations.get(1850)!;

    expect(rls.quantity).toBe(20);
    expect(rls.averagePrice).toBe(11.0);
    expect(rls.totalCost).toBe(220.0);
    expect(pcs.quantity).toBe(0);
  });

  it("should handle stock replenishment after zero stock without memory distortion", () => {
    const combinations: ReplayCombinationInitialState[] = [
      { id: 10, sku: "ITEM-A", unit: "PCS", conversionFactor: 1, isBreakPackOfId: null },
    ];

    const events: ReplayTimelineEvent[] = [
      { id: 1, type: "GOOD_RECEIPT", createdAt: new Date("2026-10-01T10:00:00Z"), combinationId: 10, quantity: 5, unitCost: 10.0 },
      { id: 2, type: "SALES_ORDER", createdAt: new Date("2026-10-02T10:00:00Z"), combinationId: 10, quantity: 5, recordedCostPrice: 10.0 },
      // Stock is now 0. Incoming batch at new price must set new average price cleanly.
      { id: 3, type: "GOOD_RECEIPT", createdAt: new Date("2026-10-03T10:00:00Z"), combinationId: 10, quantity: 10, unitCost: 25.0 },
    ];

    const result = simulateProductTimeline(combinations, events);
    const item = result.combinations.get(10)!;

    expect(item.quantity).toBe(10);
    expect(item.averagePrice).toBe(25.0);
    expect(item.totalCost).toBe(250.0);
  });

  it("should strictly exclude soft-deleted Good Receipt lines from WAC computation", () => {
    const combinations: ReplayCombinationInitialState[] = [
      { id: 1117, sku: "01-EAGCEM-PCS-ADCE-25KG", unit: "PCS", conversionFactor: 25, isBreakPackOfId: null },
    ];

    // Scenario: Receipt has 1 draft line (soft-deleted, 500 units) and 1 active line (500 units)
    const events: ReplayTimelineEvent[] = [
      {
        id: 1071,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2025-12-17T05:53:01Z"),
        combinationId: 1117,
        quantity: 500,
        unitCost: 160.0,
        isDeleted: true, // Should be ignored!
      },
      {
        id: 1072,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2025-12-17T05:53:13Z"),
        combinationId: 1117,
        quantity: 500,
        unitCost: 160.0,
        isDeleted: false,
      },
    ];

    const result = simulateProductTimeline(combinations, events);
    const cem = result.combinations.get(1117)!;

    // Quantity must be 500, NOT 1000!
    expect(cem.quantity).toBe(500);
    expect(cem.averagePrice).toBe(160.0);
    expect(cem.totalCost).toBe(80000.0);
  });

  it("should strictly ignore VOID Good Receipts", () => {
    const combinations: ReplayCombinationInitialState[] = [
      { id: 100, sku: "ITEM-VOID", unit: "PCS", conversionFactor: 1, isBreakPackOfId: null },
    ];

    const events: ReplayTimelineEvent[] = [
      {
        id: 1,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-01-01T10:00:00Z"),
        combinationId: 100,
        quantity: 100,
        unitCost: 50.0,
        status: "VOID", // Should be ignored!
      },
      {
        id: 2,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-01-02T10:00:00Z"),
        combinationId: 100,
        quantity: 20,
        unitCost: 60.0,
        status: "COMPLETED",
      },
    ];

    const result = simulateProductTimeline(combinations, events);
    const item = result.combinations.get(100)!;

    expect(item.quantity).toBe(20);
    expect(item.averagePrice).toBe(60.0);
    expect(item.totalCost).toBe(1200.0);
  });

  it("should enforce Cost-Only policy without reporting quantity changes as drift", () => {
    // Current DB state with physical on-hand quantity = 158, DB avg price = 182.00
    const currentDbState = {
      productId: 266,
      combinations: [
        { combinationId: 1117, dbAveragePrice: 182.0, dbQuantity: 158 },
      ],
      salesOrderItems: [],
    };

    // Simulation derived average price 184.00, theoretical timeline qty = 288
    const simulatedResult = {
      productId: 266,
      combinations: new Map([
        [1117, { combinationId: 1117, averagePrice: 184.0, quantity: 288, totalCost: 52992.0 }],
      ]),
      salesOrderUpdates: [],
      movementUpdates: [],
    };

    // Act: generate diff under Cost-Only policy
    const diff = generateProductReplayDiff(currentDbState, simulatedResult, { costOnly: true });

    // Assert: only average price drifted, quantity drift is 0
    expect(diff.hasDrift).toBe(true);
    expect(diff.combinationDrifts.length).toBe(1);
    expect(diff.combinationDrifts[0].recalculatedAveragePrice).toBe(184.0);
    // Under cost-only policy, quantity to be updated must preserve existing DB quantity
    expect(diff.combinationDrifts[0].targetQuantity).toBe(158);
  });

  it("should accurately deduct stock and adjust WAC on SUPPLIER_RETURN_OUT", () => {
    // Arrange: Product 427 scenario (GR 1 @ 3500 -> Return 1 @ 3500 -> GR 1 @ 3000 -> Sale 1 @ 3000)
    const combinations: ReplayCombinationInitialState[] = [
      { id: 1600, sku: "01-GRABATSTO-PCS-1LOADELFDUCK-RONDSEOR-34", unit: "PCS", conversionFactor: 1, isBreakPackOfId: null },
    ];

    const events: ReplayTimelineEvent[] = [
      // 1. GR #453: 1 load @ 3,500.00
      {
        id: 9313,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-09-01T08:21:37Z"),
        combinationId: 1600,
        quantity: 1,
        unitCost: 3500.0,
      },
      // 2. Supplier Return #9348: Return 1 load @ 3,500.00 back to supplier (stock should reset to 0 @ 0)
      {
        id: 9348,
        type: "SUPPLIER_RETURN",
        createdAt: new Date("2026-09-02T06:15:51Z"),
        combinationId: 1600,
        quantity: 1,
        unitCost: 3500.0,
      },
      // 3. GR #458: 1 new load @ 3,000.00 (should establish clean 3,000.00 WAC, NOT 3,250.00)
      {
        id: 9349,
        type: "GOOD_RECEIPT",
        createdAt: new Date("2026-09-02T06:17:01Z"),
        combinationId: 1600,
        quantity: 1,
        unitCost: 3000.0,
      },
      // 4. Sales Order #1972: 1 load sold (must capture exact 3,000.00 cost)
      {
        id: 9380,
        type: "SALES_ORDER",
        createdAt: new Date("2026-09-02T08:27:23Z"),
        salesOrderItemId: 9380,
        combinationId: 1600,
        quantity: 1,
        sellingPrice: 4500.0,
        recordedCostPrice: 3000.0,
      },
    ];

    // Act
    const result = simulateProductTimeline(combinations, events);

    // Assert
    const item = result.combinations.get(1600)!;
    expect(item.quantity).toBe(0);
    expect(item.averagePrice).toBe(3000.0);

    const so = result.salesOrderUpdates.find((s) => s.salesOrderItemId === 9380)!;
    expect(so.recalculatedCostPrice).toBe(3000.0);
    expect(so.costDifference).toBe(0); // ZERO DRIFT!
    expect(so.profitImpact).toBe(0);
  });
});


