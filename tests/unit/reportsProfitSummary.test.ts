import { describe, expect, it, vi, beforeEach } from "vitest";
import { reportsServerService } from "@/server/services/reportsServer.service";
import { db } from "@/server/db/drizzle";

describe("reportsServerService.getProfitSummary (Unit)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates totalSales, estimatedCost using COGS, netProfit, and marginPercentage", async () => {
    let callIndex = 0;
    vi.spyOn(db, "select").mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        // First call: totalSales from salesOrders
        const chain: any = {
          from: vi.fn(() => chain),
          where: vi.fn(() => Promise.resolve([{ totalSales: "1000.00" }])),
          then: (resolve: any) => Promise.resolve([{ totalSales: "1000.00" }]).then(resolve),
        };
        return chain;
      }
      // Second call: estimatedCost from salesOrderItems + inventoryMovements + inventories
      const chain: any = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        where: vi.fn(() => Promise.resolve([{ totalCost: "350.00" }])),
        then: (resolve: any) => Promise.resolve([{ totalCost: "350.00" }]).then(resolve),
      };
      return chain;
    });

    const summary = await reportsServerService.getProfitSummary();

    // Revenue: 1000, COGS: 350 -> Profit: 650, Margin: (650 / 1000) * 100 = 65.0%
    expect(summary.totalSales).toBe(1000);
    expect(summary.estimatedCost).toBe(350);
    expect(summary.netProfit).toBe(650);
    expect(summary.marginPercentage).toBe("65.0");
  });

  it("returns 0.0 margin percentage when totalSales is 0", async () => {
    let callIndex = 0;
    vi.spyOn(db, "select").mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) {
        const chain: any = {
          from: vi.fn(() => chain),
          where: vi.fn(() => Promise.resolve([{ totalSales: "0" }])),
          then: (resolve: any) => Promise.resolve([{ totalSales: "0" }]).then(resolve),
        };
        return chain;
      }
      const chain: any = {
        from: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        where: vi.fn(() => Promise.resolve([{ totalCost: "0" }])),
        then: (resolve: any) => Promise.resolve([{ totalCost: "0" }]).then(resolve),
      };
      return chain;
    });

    const summary = await reportsServerService.getProfitSummary();

    expect(summary.totalSales).toBe(0);
    expect(summary.estimatedCost).toBe(0);
    expect(summary.netProfit).toBe(0);
    expect(summary.marginPercentage).toBe("0.0");
  });
});
