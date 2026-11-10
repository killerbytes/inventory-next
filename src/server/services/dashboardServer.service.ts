import "server-only";
import { customerServerService } from "./customerServer.service";
import { getBusinessCalendar } from "./dateFilter";
import { goodReceiptServerService } from "./goodReceiptServer.service";
import { inventoryServerService } from "./inventoryServer.service";
import { reportsServerService } from "./reportsServer.service";
import { salesServerService } from "./salesServer.service";

const DASHBOARD_LIST_LIMIT = 5;

type ResultOf<T extends (...args: any) => Promise<any>> = Awaited<ReturnType<T>>;

/** Everything the dashboard renders, in the flat shape `DashboardClientWidget` consumes. */
export interface DashboardSummary {
  todaySales: { totalAmount: number; count: number; percentageChange: number };
  outstandingGoodReceipts: { totalAmount: number; count: number };
  stockAlerts: {
    count: number;
    items: ResultOf<typeof inventoryServerService.getReordersLevels>["data"];
  };
  lastMonthProfit: { totalProfit: number };
  weeklySales: ResultOf<typeof salesServerService.getDailySales>;
  recentOrders: ResultOf<typeof salesServerService.getAll>["rows"];
  recentMovements: ResultOf<typeof inventoryServerService.getMovements>["data"];
  mostPopular: ResultOf<typeof reportsServerService.getPopularProducts>["data"];
  deadStock: ResultOf<typeof reportsServerService.noSaleProducts>["data"];
  customers: ResultOf<typeof customerServerService.getAll>;
}

/** Day-over-day change in percent, rounded to one decimal. Any sales after a zero day count as +100%. */
function percentageChange(today: number, yesterday: number): number {
  if (!yesterday) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10;
}

export const dashboardServerService = {
  /**
   * Aggregates the dashboard metrics. Query failures propagate to the caller (and the
   * route error boundary) rather than being masked as an all-zero dashboard.
   * `now` and `timezone` are injectable so calendar-day boundaries can be tested.
   */
  getSummary: async (now: Date = new Date(), timezone?: string): Promise<DashboardSummary> => {
    const cal = getBusinessCalendar(now, timezone);

    const [
      todaySales,
      yesterdaySales,
      outstandingReceipts,
      lastMonthSales,
      weeklySales,
      recentOrders,
      recentMovements,
      popular,
      deadStock,
      lowStock,
      customers,
    ] = await Promise.all([
      salesServerService.getAll({ startDate: cal.today, endDate: cal.today, limit: 1 }),
      salesServerService.getAll({ startDate: cal.yesterday, endDate: cal.yesterday, limit: 1 }),
      goodReceiptServerService.getAll({ status: "RECEIVED", limit: 1 }),
      salesServerService.getAll({ startDate: cal.lastMonthStart, endDate: cal.lastMonthEnd, limit: 1 }),
      salesServerService.getDailySales(now, timezone),
      salesServerService.getAll({ limit: DASHBOARD_LIST_LIMIT, sort: "orderDate", order: "DESC" }),
      inventoryServerService.getMovements({
        limit: DASHBOARD_LIST_LIMIT,
        startDate: cal.monthStart,
        endDate: cal.monthEnd,
        sort: "updatedAt",
        order: "DESC",
      }),
      reportsServerService.getPopularProducts({
        limit: DASHBOARD_LIST_LIMIT,
        startDate: cal.monthStart,
        endDate: cal.monthEnd,
        sort: "transactionCount",
        order: "DESC",
      }),
      reportsServerService.noSaleProducts({ limit: DASHBOARD_LIST_LIMIT, sort: "quantity", order: "DESC" }),
      inventoryServerService.getReordersLevels({
        limit: DASHBOARD_LIST_LIMIT,
        sort: "lastSoldAt",
        order: "DESC",
      }),
      customerServerService.getAll(),
    ]);

    const todayTotal = Number(todaySales.summary.totalAmount);
    const yesterdayTotal = Number(yesterdaySales.summary.totalAmount);

    return {
      todaySales: {
        totalAmount: todayTotal,
        count: todaySales.pagination.total,
        percentageChange: percentageChange(todayTotal, yesterdayTotal),
      },
      outstandingGoodReceipts: {
        totalAmount: Number(outstandingReceipts.summary.totalAmount),
        count: outstandingReceipts.pagination.total,
      },
      stockAlerts: { count: lowStock.meta.total, items: lowStock.data },
      lastMonthProfit: { totalProfit: Number(lastMonthSales.summary.totalProfitAmount) },
      weeklySales,
      recentOrders: recentOrders.rows,
      recentMovements: recentMovements.data,
      mostPopular: popular.data,
      deadStock: deadStock.data,
      customers,
    };
  },
};
