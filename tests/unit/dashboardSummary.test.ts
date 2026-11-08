import { afterEach, describe, expect, it, vi } from "vitest";
import { dashboardServerService } from "@/server/services/dashboardServer.service";
import { getBusinessCalendar } from "@/server/services/dateFilter";
import { salesServerService } from "@/server/services/salesServer.service";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { reportsServerService } from "@/server/services/reportsServer.service";
import { customerServerService } from "@/server/services/customerServer.service";

const salesPage = (totalAmount: number, total: number, totalProfitAmount = 0, rows: any[] = []) =>
  ({
    data: rows,
    rows,
    pagination: { total, totalPages: 1, currentPage: 1 },
    summary: { totalAmount, totalProfitAmount, totalReturnAmount: 0, totalExchangeAmount: 0 },
  }) as any;

function arrangeServices(opts: { today: number; yesterday: number }) {
  const salesGetAll = vi
    .spyOn(salesServerService, "getAll")
    .mockImplementation(async (params: any = {}) => {
      if (params.limit === 5) return salesPage(0, 0, 0, [{ id: 11, orderNumber: "SO-11" }]);
      if (params.startDate === "2026-11-08") return salesPage(opts.today, 3);
      if (params.startDate === "2026-11-07") return salesPage(opts.yesterday, 2);
      if (params.startDate === "2026-10-01") return salesPage(90000, 40, 25000);
      throw new Error(`unexpected sales query ${JSON.stringify(params)}`);
    });
  vi.spyOn(salesServerService, "getDailySales").mockResolvedValue([{ date: "2026-11-08", total: 1 }] as any);
  vi.spyOn(goodReceiptServerService, "getAll").mockResolvedValue({
    data: [],
    pagination: { total: 4 },
    meta: { total: 4 },
    summary: { totalAmount: 7200 },
  } as any);
  vi.spyOn(inventoryServerService, "getMovements").mockResolvedValue({
    data: [{ id: 21 }],
    meta: { total: 1 },
  } as any);
  vi.spyOn(inventoryServerService, "getReordersLevels").mockResolvedValue({
    data: [{ id: 31 }, { id: 32 }],
    meta: { total: 9, totalPages: 2, currentPage: 1 },
  } as any);
  vi.spyOn(reportsServerService, "getPopularProducts").mockResolvedValue({ data: [{ id: 41 }] } as any);
  vi.spyOn(reportsServerService, "noSaleProducts").mockResolvedValue({ data: [{ id: 51 }] } as any);
  vi.spyOn(customerServerService, "getAll").mockResolvedValue([{ id: 61, name: "Walk-in" }] as any);
  return { salesGetAll };
}

// 2026-11-08 08:00 in Manila is still 2026-11-07 in UTC, which exposes server-local date math.
const NOW = new Date("2026-11-08T00:00:00Z");

describe("getBusinessCalendar (Unit)", () => {
  it("derives calendar days in the business timezone, not the server's", () => {
    expect(getBusinessCalendar(new Date("2026-11-07T23:30:00Z"), "Asia/Manila")).toEqual({
      today: "2026-11-08",
      yesterday: "2026-11-07",
      monthStart: "2026-11-01",
      monthEnd: "2026-11-30",
      lastMonthStart: "2026-10-01",
      lastMonthEnd: "2026-10-31",
    });
  });

  it("rolls last month back across a year boundary", () => {
    const cal = getBusinessCalendar(new Date("2026-01-15T04:00:00Z"), "Asia/Manila");
    expect([cal.lastMonthStart, cal.lastMonthEnd]).toEqual(["2025-12-01", "2025-12-31"]);
  });
});

describe("dashboardServerService.getSummary (Unit)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a flat summary the dashboard widget can render directly", async () => {
    arrangeServices({ today: 1500, yesterday: 1000 });

    const summary = await dashboardServerService.getSummary(NOW, "Asia/Manila");

    expect(summary).toEqual({
      todaySales: { totalAmount: 1500, count: 3, percentageChange: 50 },
      outstandingGoodReceipts: { totalAmount: 7200, count: 4 },
      stockAlerts: { count: 9, items: [{ id: 31 }, { id: 32 }] },
      lastMonthProfit: { totalProfit: 25000 },
      weeklySales: [{ date: "2026-11-08", total: 1 }],
      recentOrders: [{ id: 11, orderNumber: "SO-11" }],
      recentMovements: [{ id: 21 }],
      mostPopular: [{ id: 41 }],
      deadStock: [{ id: 51 }],
      customers: [{ id: 61, name: "Walk-in" }],
    });
  });

  it("queries today's sales by business-timezone calendar day", async () => {
    const { salesGetAll } = arrangeServices({ today: 0, yesterday: 0 });

    await dashboardServerService.getSummary(NOW, "Asia/Manila");

    expect(salesGetAll).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: "2026-11-08", endDate: "2026-11-08" }),
    );
  });

  it.each([
    { today: 1500, yesterday: 1000, expected: 50 },
    { today: 333, yesterday: 1000, expected: -66.7 },
    { today: 500, yesterday: 0, expected: 100 },
    { today: 0, yesterday: 0, expected: 0 },
  ])(
    "reports day-over-day change of $expected% for today=$today vs yesterday=$yesterday",
    async ({ today, yesterday, expected }) => {
      arrangeServices({ today, yesterday });

      const summary = await dashboardServerService.getSummary(NOW, "Asia/Manila");

      expect(summary.todaySales.percentageChange).toBe(expected);
    },
  );

  it("propagates query failures instead of rendering an all-zero dashboard", async () => {
    arrangeServices({ today: 0, yesterday: 0 });
    vi.spyOn(inventoryServerService, "getMovements").mockRejectedValue(new Error("db down"));

    await expect(dashboardServerService.getSummary(NOW, "Asia/Manila")).rejects.toThrow("db down");
  });
});
