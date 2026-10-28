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
import { PAGINATION, INVENTORY_MOVEMENT_REFERENCE_TYPE, ORDER_STATUS } from "@/constants";
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
  inArray,
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

  getBreakPacks: async (
    params: { limit?: number; page?: number; offset?: number } = {},
  ) => {
    const { page } = params;
    const limit = Number(params.limit) || 50;

    const offset =
      params.offset !== undefined
        ? params.offset
        : limit && page
          ? (page - 1) * limit
          : undefined;

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
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page || 1,
      },
    };

    // return await db.query.breakPacks.findMany({
    //   with: {
    //     fromCombination: { with: { product: true } },
    //     toCombination: { with: { product: true } },
    //     user: true,
    //   },
    //   orderBy: (tbl, { desc }) => [desc(tbl.id)],
    // });
  },

  getPopularProducts: async (params: { limit?: number; page?: number; offset?: number; startDate?: string | null; endDate?: string | null; sort?: string; order?: string; } = {}) => {
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
      isNull(productCombinations.deletedAt),
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
        combination: productCombinations,
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


    return {
      data: rows,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    };
  },

  getProfitProducts: async (params: any = {}) => {
    const {
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      startDate = null,
      endDate = null,
      sort = "profit",
      order = "DESC",
    } = params;
    const offset = (Number(page) - 1) * Number(limit);

    const { startBound, endBound } = getDateBounds(startDate, endDate);

    const orderConditions: any[] = [
      eq(salesOrderItems.salesOrderId, salesOrders.id),
      isNull(salesOrders.deletedAt),
      inArray(salesOrders.status, [
        ORDER_STATUS.RECEIVED,
        ORDER_STATUS.COMPLETED,
      ]),
    ];
    if (startBound) {
      orderConditions.push(gte(salesOrders.orderDate, startBound));
    }
    if (endBound) {
      orderConditions.push(lte(salesOrders.orderDate, endBound));
    }

    const orderDir = order.toUpperCase() === "ASC" ? asc : desc;
    let orderExpression: any = orderDir(
      sql`sum(${salesOrderItems.totalAmount} - (${salesOrderItems.quantity} * coalesce(${inventoryMovements.costPerUnit}, ${inventories.averagePrice}, 0)))`,
    );
    if (sort === "revenue") {
      orderExpression = orderDir(sql`sum(${salesOrderItems.totalAmount})`);
    } else if (sort === "quantity") {
      orderExpression = orderDir(sql`sum(${salesOrderItems.quantity})`);
    } else if (sort === "name") {
      orderExpression = orderDir(
        sql`coalesce(${productCombinations.name}, max(${salesOrderItems.nameSnapshot}))`,
      );
    }

    const baseQuery = db
      .select({
        combinationId: salesOrderItems.combinationId,
        productId: productCombinations.productId,
        nameSnapshot: sql<string>`coalesce(${productCombinations.name}, max(${salesOrderItems.nameSnapshot}))`.as(
          "nameSnapshot",
        ),
        skuSnapshot: sql<string>`coalesce(${productCombinations.sku}, max(${salesOrderItems.skuSnapshot}))`.as(
          "skuSnapshot",
        ),
        unit: sql<string>`coalesce(${productCombinations.unit}, max(${salesOrderItems.unit}))`.as(
          "unit",
        ),
        totalQuantity: sql<number>`coalesce(sum(${salesOrderItems.quantity}), 0)::numeric`.as(
          "totalQuantity",
        ),
        totalRevenue: sql<number>`coalesce(sum(${salesOrderItems.totalAmount}), 0)::numeric`.as(
          "totalRevenue",
        ),
        totalCost: sql<number>`coalesce(sum(${salesOrderItems.quantity} * coalesce(${inventoryMovements.costPerUnit}, ${inventories.averagePrice}, 0)), 0)::numeric`.as(
          "totalCost",
        ),
        totalProfit: sql<number>`coalesce(sum(${salesOrderItems.totalAmount} - (${salesOrderItems.quantity} * coalesce(${inventoryMovements.costPerUnit}, ${inventories.averagePrice}, 0))), 0)::numeric`.as(
          "totalProfit",
        ),
      })
      .from(salesOrderItems)
      .innerJoin(salesOrders, and(...orderConditions))
      .leftJoin(
        productCombinations,
        eq(salesOrderItems.combinationId, productCombinations.id),
      )
      .leftJoin(
        inventories,
        eq(productCombinations.id, inventories.combinationId),
      )
      .leftJoin(
        inventoryMovements,
        and(
          eq(inventoryMovements.referenceId, salesOrders.id),
          eq(inventoryMovements.combinationId, salesOrderItems.combinationId),
          eq(
            inventoryMovements.referenceType,
            INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER,
          ),
        ),
      )
      .where(isNull(salesOrderItems.deletedAt))
      .groupBy(
        salesOrderItems.combinationId,
        productCombinations.id,
        productCombinations.productId,
        productCombinations.name,
        productCombinations.sku,
        productCombinations.unit,
      );

    const rows = await baseQuery
      .orderBy(orderExpression)
      .limit(Number(limit))
      .offset(offset);

    const countQuery = await db
      .select({
        count: sql<number>`count(distinct ${salesOrderItems.combinationId})::int`,
      })
      .from(salesOrderItems)
      .innerJoin(salesOrders, and(...orderConditions))
      .where(isNull(salesOrderItems.deletedAt));
    const total = countQuery[0]?.count ?? 0;

    const data = rows.map((r) => {
      const totalRevenue = Number(r.totalRevenue || 0);
      const totalCost = Number(r.totalCost || 0);
      const totalProfit = Number(r.totalProfit || 0);
      const marginPercentage =
        totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";

      return {
        combinationId: r.combinationId,
        productId: r.productId,
        nameSnapshot: r.nameSnapshot,
        skuSnapshot: r.skuSnapshot,
        unit: r.unit,
        totalQuantity: Number(r.totalQuantity || 0),
        totalRevenue,
        totalCost,
        totalProfit,
        marginPercentage,
      };
    });

    return {
      data,
      meta: {
        total,
        totalPages: Math.ceil(total / Number(limit)),
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


  getReorderLevels: async (params: GetReordersLevelsInput = {}) => {
    return await inventoryServerService.getReordersLevels(params);
  },

  getProfitSummary: async (
    params: { startDate?: string | null; endDate?: string | null } = {},
  ) => {
    const { startDate = null, endDate = null } = params;
    const { startBound, endBound } = getDateBounds(startDate, endDate);

    const orderConditions: any[] = [
      isNull(salesOrders.deletedAt),
      inArray(salesOrders.status, [
        ORDER_STATUS.RECEIVED,
        ORDER_STATUS.COMPLETED,
      ]),
    ];
    if (startBound) {
      orderConditions.push(gte(salesOrders.orderDate, startBound));
    }
    if (endBound) {
      orderConditions.push(lte(salesOrders.orderDate, endBound));
    }

    const [salesResult] = await db
      .select({
        totalSales: sql<string>`coalesce(sum(${salesOrders.totalAmount}), 0)`,
      })
      .from(salesOrders)
      .where(and(...orderConditions));

    const itemConditions: any[] = [
      isNull(salesOrderItems.deletedAt),
      isNull(salesOrders.deletedAt),
      inArray(salesOrders.status, [
        ORDER_STATUS.RECEIVED,
        ORDER_STATUS.COMPLETED,
      ]),
    ];
    if (startBound) {
      itemConditions.push(gte(salesOrders.orderDate, startBound));
    }
    if (endBound) {
      itemConditions.push(lte(salesOrders.orderDate, endBound));
    }

    const [costResult] = await db
      .select({
        totalCost: sql<string>`coalesce(sum(${salesOrderItems.quantity} * coalesce(${inventoryMovements.costPerUnit}, ${inventories.averagePrice}, 0)), 0)`,
      })
      .from(salesOrderItems)
      .innerJoin(
        salesOrders,
        eq(salesOrderItems.salesOrderId, salesOrders.id),
      )
      .leftJoin(
        inventories,
        eq(salesOrderItems.combinationId, inventories.combinationId),
      )
      .leftJoin(
        inventoryMovements,
        and(
          eq(inventoryMovements.referenceId, salesOrders.id),
          eq(inventoryMovements.combinationId, salesOrderItems.combinationId),
          eq(
            inventoryMovements.referenceType,
            INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER,
          ),
        ),
      )
      .where(and(...itemConditions));
    const totalSales = Number(salesResult?.totalSales || 0);
    const estimatedCost = Number(costResult?.totalCost || 0);
    const netProfit = totalSales - estimatedCost;

    return {
      totalSales,
      estimatedCost,
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
