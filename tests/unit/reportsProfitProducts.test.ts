import { describe, expect, it, vi, beforeEach } from "vitest";
import { reportsServerService } from "@/server/services/reportsServer.service";
import { db } from "@/server/db/drizzle";

describe("reportsServerService.getProfitProducts (Unit)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns paginated products with enriched revenue, cost, profit, and marginPercentage", async () => {
    let callIndex = 0;
    vi.spyOn(db, "select").mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // baseQuery execution
        const mockRows = [
          {
            combinationId: 10,
            productId: 5,
            nameSnapshot: "Cement Bag 50kg",
            skuSnapshot: "CEM-50",
            unit: "BAG",
            totalQuantity: "10.000000",
            totalRevenue: "2500.00",
            totalCost: "1800.00",
            totalProfit: "700.00",
          },
        ];
        const chain: any = {
          from: vi.fn(() => chain),
          innerJoin: vi.fn(() => chain),
          leftJoin: vi.fn(() => chain),
          where: vi.fn(() => chain),
          groupBy: vi.fn(() => chain),
          orderBy: vi.fn(() => chain),
          limit: vi.fn(() => chain),
          offset: vi.fn(() => Promise.resolve(mockRows)),
          then: (resolve: any) => Promise.resolve(mockRows).then(resolve),
        };
        return chain;
      }

      // countQuery execution
      const chain: any = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        where: vi.fn(() => Promise.resolve([{ count: 1 }])),
        then: (resolve: any) => Promise.resolve([{ count: 1 }]).then(resolve),
      };
      return chain;
    });

    const result = await reportsServerService.getProfitProducts({ page: 1, limit: 10 });

    expect(result.data).toHaveLength(1);
    const row = result.data[0];
    expect(row.combinationId).toBe(10);
    expect(row.productId).toBe(5);
    expect(row.nameSnapshot).toBe("Cement Bag 50kg");
    expect(row.skuSnapshot).toBe("CEM-50");
    expect(row.unit).toBe("BAG");
    expect(row.totalQuantity).toBe(10);
    expect(row.totalRevenue).toBe(2500);
    expect(row.totalCost).toBe(1800);
    expect(row.totalProfit).toBe(700);
    // Margin: (700 / 2500) * 100 = 28.0%
    expect(row.marginPercentage).toBe("28.0");
    expect(result.meta.total).toBe(1);
  });

  it("passes productCombinations.id in groupBy instead of salesOrderItems.skuSnapshot", async () => {
    let capturedGroupByArgs: any[] = [];
    vi.spyOn(db, "select").mockImplementation(() => {
      const chain: any = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        where: vi.fn(() => chain),
        groupBy: vi.fn((...args: any[]) => {
          capturedGroupByArgs = args;
          return chain;
        }),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        offset: vi.fn(() => Promise.resolve([])),
        then: (resolve: any) => Promise.resolve([{ count: 0 }]).then(resolve),
      };
      return chain;
    });

    await reportsServerService.getProfitProducts({ page: 1, limit: 10 });

    // Ensure combination entity grouping is used
    expect(capturedGroupByArgs.length).toBeGreaterThanOrEqual(1);
    // Stringified inspection of group by columns: should NOT include raw skuSnapshot column alone without entity id
    const isComboIdIncluded = capturedGroupByArgs.some((arg: any) => {
      return arg && (arg.name === "id" || arg.name === "combinationId" || arg._?.name === "id");
    });
    expect(isComboIdIncluded).toBe(true);
  });
});
