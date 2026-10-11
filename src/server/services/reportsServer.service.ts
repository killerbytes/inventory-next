import { db } from "@/server/db/drizzle";
import {
  breakPacks,
  inventories,
  inventoryMovements,
  priceHistories,
  productCombinations,
  salesOrders,
  salesOrderItems,
  stockAdjustments,
} from "@/server/db/schema";
import { PAGINATION } from "@/constants";
import {
  eq,
  and,
  isNull,
  desc,
  asc,
  gte,
  lte,
  ilike,
  or,
  notInArray,
  sql,
} from "drizzle-orm";
import "server-only";
import {
  GetReordersLevelsInput,
  inventoryServerService,
} from "./inventoryServer.service";
import { getDateBounds } from "./dateFilter";

export const reportsServerService = {
  getPriceHistory: async () => {
    return await db.query.priceHistories.findMany({
      with: {
        combination: {
          with: { product: true },
        },
        user: true,
      },
      orderBy: (tbl, { desc }) => [desc(tbl.id)],
    });
  },

  getBreakPacks: async (
    params: { limit?: number; page?: number; offset?: number } = {},
  ) => {
    const { limit, page } = params;
    const offset =
      params.offset !== undefined
        ? params.offset
        : limit && page
          ? (page - 1) * limit
          : undefined;

    if (limit !== undefined) {
      const [countRes] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(breakPacks);
      const total = countRes?.count ?? 0;

      const rows = await db.query.breakPacks.findMany({
        with: {
          fromCombination: { with: { product: true } },
          toCombination: { with: { product: true } },
          user: true,
        },
        orderBy: (tbl, { desc }) => [desc(tbl.id)],
        limit,
        offset: offset || 0,
      });

      return {
        rows,
        meta: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page || 1,
        },
      };
    }

    return await db.query.breakPacks.findMany({
      with: {
        fromCombination: { with: { product: true } },
        toCombination: { with: { product: true } },
        user: true,
      },
      orderBy: (tbl, { desc }) => [desc(tbl.id)],
    });
  },

  getPopularProducts: async (params: any = {}) => {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      startDate = null,
      endDate = null,
      sort = "transactionCount",
      order = "DESC",
    } = params;
    const offset = (page - 1) * limit;

    const { startBound, endBound } = getDateBounds(startDate, endDate);
    const orderConditions: any[] = [
      eq(salesOrders.status, "RECEIVED"),
      isNull(salesOrders.deletedAt),
      isNull(salesOrderItems.deletedAt),
    ];
    if (startBound) {
      orderConditions.push(gte(salesOrders.orderDate, startBound));
    }
    if (endBound) {
      orderConditions.push(lte(salesOrders.orderDate, endBound));
    }

    const orderDir = order.toUpperCase() === "ASC" ? asc : desc;
    let orderExpression: any = orderDir(sql`count(distinct ${salesOrders.id})`);
    if (sort === "name") {
      orderExpression = orderDir(productCombinations.name);
    }

    const baseQuery = db
      .select({
        combinationId: salesOrderItems.combinationId,
        combinationName: productCombinations.name,
        transactionCount: sql<number>`count(distinct ${salesOrders.id})::int`.as(
          "transactionCount",
        ),
      })
      .from(salesOrderItems)
      .innerJoin(salesOrders, eq(salesOrderItems.salesOrderId, salesOrders.id))
      .leftJoin(
        productCombinations,
        eq(salesOrderItems.combinationId, productCombinations.id),
      )
      .where(and(...orderConditions))
      .groupBy(
        salesOrderItems.combinationId,
        productCombinations.id,
        productCombinations.name,
      );

    const rows = await baseQuery
      .orderBy(orderExpression)
      .limit(limit)
      .offset(offset);

    const countQuery = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(baseQuery.as("subquery"));
    const total = countQuery[0]?.count ?? 0;

    const data = rows.map((r) => ({
      combinationId: r.combinationId,
      transactionCount: r.transactionCount,
      combination: {
        id: r.combinationId,
        name: r.combinationName,
      },
      combinations: {
        id: r.combinationId,
        name: r.combinationName,
      },
    }));

    return {
      data,
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    };
  },

  getProfitProducts: async (params: any = {}) => {
    const { limit = 50, page = 1 } = params;
    const offset = (page - 1) * limit;

    const baseQuery = db
      .select({
        combinationId: salesOrderItems.combinationId,
        nameSnapshot: salesOrderItems.nameSnapshot,
        unit: salesOrderItems.unit,
        totalQuantity: sql<number>`sum(${salesOrderItems.quantity})::numeric`.as(
          "totalQuantity",
        ),
        totalProfit: sql<number>`sum((${salesOrderItems.purchasePrice} - coalesce(${inventories.averagePrice}, 0)) * ${salesOrderItems.quantity})::numeric`.as(
          "totalProfit",
        ),
      })
      .from(salesOrderItems)
      .innerJoin(salesOrders, eq(salesOrderItems.salesOrderId, salesOrders.id))
      .leftJoin(
        productCombinations,
        eq(salesOrderItems.combinationId, productCombinations.id),
      )
      .leftJoin(
        inventories,
        eq(productCombinations.id, inventories.combinationId),
      )
      .where(isNull(salesOrderItems.deletedAt))
      .groupBy(
        salesOrderItems.combinationId,
        salesOrderItems.nameSnapshot,
        salesOrderItems.unit,
      );

    const rows = await baseQuery.limit(limit).offset(offset);

    const countQuery = await db
      .select({
        count: sql<number>`count(distinct ${salesOrderItems.combinationId})::int`,
      })
      .from(salesOrderItems)
      .where(isNull(salesOrderItems.deletedAt));
    const total = countQuery[0]?.count ?? 0;

    return {
      data: rows,
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    };
  },

  noSaleProducts: async (params: any = {}) => {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      sort = "quantity",
      order = "DESC",
      q,
      startDate = null,
      endDate = null,
    } = params;
    const offset = (page - 1) * limit;

    const soldSubquery = db
      .select({ combinationId: salesOrderItems.combinationId })
      .from(salesOrderItems)
      .innerJoin(
        salesOrders,
        and(
          eq(salesOrderItems.salesOrderId, salesOrders.id),
          eq(salesOrders.status, "RECEIVED"),
          isNull(salesOrders.deletedAt),
        ),
      )
      .where(isNull(salesOrderItems.deletedAt));

    const conditions: any[] = [
      isNull(productCombinations.deletedAt),
      sql`${inventories.quantity} > 0`,
      notInArray(productCombinations.id, soldSubquery),
    ];

    if (q) {
      conditions.push(
        or(
          ilike(productCombinations.name, `%${q}%`),
          ilike(productCombinations.sku, `%${q}%`),
        ),
      );
    }

    const { startBound, endBound } = getDateBounds(startDate, endDate);
    if (startBound) {
      conditions.push(gte(productCombinations.createdAt, startBound));
    }
    if (endBound) {
      conditions.push(lte(productCombinations.createdAt, endBound));
    }

    const orderDir = order.toUpperCase() === "ASC" ? asc : desc;
    let orderExpression: any = orderDir(inventories.quantity);
    if (sort === "name") {
      orderExpression = orderDir(productCombinations.name);
    }

    const baseQuery = db
      .select({
        id: productCombinations.id,
        productId: productCombinations.productId,
        name: productCombinations.name,
        sku: productCombinations.sku,
        unit: productCombinations.unit,
        price: productCombinations.price,
        conversionFactor: productCombinations.conversionFactor,
        reorderLevel: productCombinations.reorderLevel,
        isBreakPack: productCombinations.isBreakPack,
        isBreakPackOfId: productCombinations.isBreakPackOfId,
        isActive: productCombinations.isActive,
        createdAt: productCombinations.createdAt,
        updatedAt: productCombinations.updatedAt,
        inventory: {
          id: inventories.id,
          quantity: inventories.quantity,
          averagePrice: inventories.averagePrice,
        },
      })
      .from(productCombinations)
      .innerJoin(
        inventories,
        eq(productCombinations.id, inventories.combinationId),
      )
      .where(and(...conditions));

    const rows = await baseQuery
      .orderBy(orderExpression)
      .limit(limit)
      .offset(offset);

    const countQuery = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(baseQuery.as("subquery"));
    const total = countQuery[0]?.count ?? 0;

    return {
      data: rows,
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    };
  },

  getInventoryValue: async () => {
    const [res] = await db
      .select({
        totalValue: sql<string>`coalesce(sum(${inventories.quantity} * ${inventories.averagePrice}), 0)`,
      })
      .from(inventories)
      .where(isNull(inventories.deletedAt));

    return {
      totalValue: parseFloat(res?.totalValue ?? "0") || 0,
    };
  },

  getInventoryValueFromMovements: async () => {
    const [res] = await db
      .select({
        totalValue: sql<string>`coalesce(sum(${inventoryMovements.totalCost}), 0)`,
      })
      .from(inventoryMovements);

    return {
      totalValue: parseFloat(res?.totalValue ?? "0") || 0,
    };
  },

  getReorderLevels: async (params: GetReordersLevelsInput = {}) => {
    return await inventoryServerService.getReordersLevels(params);
  },

  getNoSales: async (params: any = {}) => {
    return await reportsServerService.noSaleProducts(params);
  },

  getProfitSummary: async () => {
    const orders = await db.query.salesOrders.findMany({
      where: (tbl, { isNull }) => isNull(tbl.deletedAt),
      with: {
        salesOrderItems: true,
      },
    });

    const totalSales = orders.reduce(
      (acc, o) => acc + Number(o.totalAmount || 0),
      0,
    );
    let totalCost = 0;
    for (const order of orders) {
      const items = order.salesOrderItems || [];
      for (const item of items) {
        const qty = Number(item.quantity || 0);
        const origPrice = Number(item.originalPrice || item.purchasePrice || 0);
        totalCost += qty * origPrice;
      }
    }
    const netProfit = totalSales - totalCost;

    return {
      totalSales,
      estimatedCost: totalCost,
      netProfit,
      marginPercentage:
        totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0",
    };
  },

  getStockAdjustments: async () => {
    const rows = await db.query.stockAdjustments.findMany({
      with: {
        combination: {
          with: { product: true },
        },
        user: true,
      },
      orderBy: (tbl, { desc }) => [desc(tbl.id)],
    });

    return rows.map((r) => ({
      ...r,
      systemQuantity: Number(r.systemQuantity),
      newQuantity: Number(r.newQuantity),
      difference: Number(r.difference),
    }));
  },
};
