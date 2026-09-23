"use server";

import { customerServerService } from "@/server/services/customerServer.service";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { inventoryServerService } from "@/server/services/inventoryServer.service";
import { reportsServerService } from "@/server/services/reportsServer.service";
import { salesServerService } from "@/server/services/salesServer.service";
import { PERMISSIONS } from "@/lib/rbac";
import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { createProtectedAction } from "./safeAction";

export const getDashboardDataAction = createProtectedAction({
  permission: PERMISSIONS.VIEW_REPORTS,
  handler: async () => {
    try {
      const now = new Date();

    const todayStart = format(startOfDay(now), "yyyy-MM-dd HH:mm:ss");
    const todayEnd = format(endOfDay(now), "yyyy-MM-dd HH:mm:ss");

    const yesterdayStart = format(startOfDay(subDays(now, 1)), "yyyy-MM-dd HH:mm:ss");
    const yesterdayEnd = format(endOfDay(subDays(now, 1)), "yyyy-MM-dd HH:mm:ss");

    const lastMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd HH:mm:ss");
    const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd HH:mm:ss");

    const currentMonthStart = format(startOfMonth(now), "yyyy-MM-dd HH:mm:ss");
    const currentMonthEnd = format(endOfMonth(now), "yyyy-MM-dd HH:mm:ss");

    // Run parallel queries across production server services
    const [
      todaySalesRes,
      yesterdaySalesRes,
      outstandingReceiptsRes,
      lastMonthSalesRes,
      weeklySales,
      recentOrdersRes,
      recentMovementsRes,
      popularRes,
      deadStockRes,
      lowStockRes,
      customers,
    ] = await Promise.all([
      // 1. Today sales summary
      salesServerService.getAll({
        startDate: todayStart,
        endDate: todayEnd,
        limit: 1,
      }),
      // 2. Yesterday sales summary
      salesServerService.getAll({
        startDate: yesterdayStart,
        endDate: yesterdayEnd,
        limit: 1,
      }),
      // 3. Outstanding good receipts
      goodReceiptServerService.getAll({
        status: "RECEIVED",
        limit: 1,
      }),
      // 4. Last month sales & gross profit (via movements COGS query)
      salesServerService.getAll({
        startDate: lastMonthStart,
        endDate: lastMonthEnd,
        limit: 1,
      }),
      // 5. Rolling daily sales
      salesServerService.getDailySales(),
      // 6. Recent sales orders
      salesServerService.getAll({
        limit: 5,
        sort: "orderDate",
        order: "DESC",
      }),
      // 7. Recent inventory movements
      inventoryServerService.getMovements({
        limit: 5,
        startDate: currentMonthStart,
        endDate: currentMonthEnd,
        sort: "updatedAt",
        order: "DESC",
      }),
      // 8. Popular products
      reportsServerService.getPopularProducts({
        limit: 5,
        startDate: currentMonthStart,
        endDate: currentMonthEnd,
        sort: "transactionCount",
        order: "DESC",
      }),
      // 9. Dead stock
      reportsServerService.noSaleProducts({
        limit: 5,
        sort: "quantity",
        order: "DESC",
      }),
      // 10. Low stock / reorder levels
      inventoryServerService.getReordersLevels({
        limit: 5,
        sort: "lastSoldAt",
        order: "DESC",
      }),
      // 11. Customers for modal
      customerServerService.getAll().catch(() => []),
    ]);

    // Calculate today vs yesterday sales
    const todayTotal = todaySalesRes.summary?.totalAmount?.value ?? 0;
    const yesterdayTotal = yesterdaySalesRes.summary?.totalAmount?.value ?? 0;
    const percentageChange =
      !yesterdayTotal || yesterdayTotal === 0
        ? todayTotal > 0
          ? 100
          : 0
        : ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;

    // Outstanding good receipts total
    const outstandingTotal =
      typeof outstandingReceiptsRes.summary?.totalAmount === "object"
        ? (outstandingReceiptsRes.summary?.totalAmount as any)?.value ?? 0
        : Number(outstandingReceiptsRes.summary?.totalAmount ?? 0);

    // Last month calculated gross profit
    const lastMonthProfit =
      lastMonthSalesRes.summary?.totalProfitAmount?.value ?? 0;

    // Low stock count & items
    const lowStockTotal = lowStockRes.meta?.total ?? 0;
    const lowStockItems = lowStockRes.data || [];

    return {
      todaySales: {
        totalAmount: todayTotal,
        count: todaySalesRes.meta?.total ?? 0,
        percentageChange: Math.round(percentageChange * 10) / 10,
      },
      outstandingGoodReceipts: {
        totalAmount: outstandingTotal,
        count: outstandingReceiptsRes.meta?.total ?? 0,
      },
      stockAlerts: {
        count: lowStockTotal,
        items: JSON.parse(JSON.stringify(lowStockItems)),
      },
      lastMonthProfit: {
        totalProfit: lastMonthProfit,
      },
      weeklySales: weeklySales || [],
      recentOrders: JSON.parse(JSON.stringify(recentOrdersRes.rows || [])),
      recentMovements: JSON.parse(JSON.stringify(recentMovementsRes.data || [])),
      mostPopular: JSON.parse(JSON.stringify(popularRes.data || [])),
      deadStock: JSON.parse(JSON.stringify(deadStockRes.data || [])),
      customers: JSON.parse(JSON.stringify(customers || [])),
    };
  } catch (err: any) {
    console.error("Failed to generate dashboard metrics:", err);
    return {
      todaySales: { totalAmount: 0, count: 0, percentageChange: 0 },
      outstandingGoodReceipts: { totalAmount: 0, count: 0 },
      stockAlerts: { count: 0, items: [] },
      lastMonthProfit: { totalProfit: 0 },
      weeklySales: [],
      recentOrders: [],
      recentMovements: [],
      mostPopular: [],
      deadStock: [],
      customers: [],
    };
  }
},
});
