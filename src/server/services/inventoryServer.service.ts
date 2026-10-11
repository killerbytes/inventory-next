import { truncateQty } from "@/lib/compute";
import { db } from "@/server/db/drizzle";
import {
  inventories,
  inventoryMovements,
  priceHistories,
  productCombinations,
  salesOrders,
  salesOrderItems,
  returnTransactions,
  returnItems,
} from "@/server/db/schema";

import { INVENTORY_MOVEMENT_TYPE } from "@/constants";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, ne, sql, count } from "drizzle-orm";
import moment from "moment-timezone";
import "server-only";

export interface GetReordersLevelsInput {
  limit?: number;
  page?: number;
  sort?:
  | "lastSoldAt"
  | "quantity"
  | "reorderLevel"
  | "name"
  | "transactionCount"
  | string;
  order?: "ASC" | "DESC";
}

export interface GetPriceHistoryInput {
  productId?: number | string;
  limit?: number;
  page?: number;
  q?: string | null;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface GetMovementsInput {
  ids?: number[];
  limit?: number;
  page?: number;
  q?: string | null;
  type?: string;
  sort?: string;
  order?: "ASC" | "DESC";
  startDate?: string | Date | null;
  endDate?: string | Date | null;
}


/**
 * Converts date inputs into timezone-aligned UTC boundaries.
 */
function getDateBounds(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  timezone: string = process.env.TIMEZONE || "Asia/Manila",
) {
  let startBound: Date | undefined;
  let endBound: Date | undefined;

  if (startDate) {
    startBound = moment.tz(startDate, timezone).startOf("day").utc().toDate();
  }
  if (endDate) {
    endBound = moment.tz(endDate, timezone).endOf("day").utc().toDate();
  }

  return { startBound, endBound };
}

export const inventoryServerService = {
  getPriceHistory: async (params: GetPriceHistoryInput = {}) => {
    const {
      productId,
      limit = 50,
      page = 1,
      q = null,
      sort = "id",
      order = "DESC",
    } = params;

    const offset = (page - 1) * limit;

    const conditions = [];
    if (productId) {
      conditions.push(eq(priceHistories.productId, Number(productId)));
    }

    if (q) {
      const matchingCombos = db
        .select({ id: productCombinations.id })
        .from(productCombinations)
        .where(ilike(productCombinations.name, `%${q}%`));
      conditions.push(inArray(priceHistories.combinationId, matchingCombos));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ total: count(priceHistories.id) })
      .from(priceHistories)
      .where(whereClause);

    const total = Number(countResult?.total || 0);

    const historyRows = await db.query.priceHistories.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (tbl, { asc, desc }) => {
        const col = tbl[sort as keyof typeof tbl] || tbl.id;
        return order.toUpperCase() === "ASC" ? asc(col) : desc(col);
      },
      with: {
        user: {
          columns: { id: true, username: true, name: true, role: true },
        },
        combination: {
          with: {
            product: true,
          },
        },
      },
    });

    return {
      data: historyRows,
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  },

  getMovements: async (params: GetMovementsInput = {}) => {
    const {
      ids = [],
      limit = 50,
      page = 1,
      q = null,
      type,
      sort = "updatedAt",
      order = "DESC",
      startDate,
      endDate,
    } = params;

    const offset = (page - 1) * limit;
    const conditions = [];

    if (type && type !== "ALL") {
      conditions.push(eq(inventoryMovements.type, type));
    }

    const { startBound, endBound } = getDateBounds(startDate, endDate);
    if (startBound) {
      conditions.push(gte(inventoryMovements.updatedAt, startBound));
    }
    if (endBound) {
      conditions.push(lte(inventoryMovements.updatedAt, endBound));
    }

    if (q) {
      const matchingCombos = db
        .select({ id: productCombinations.id })
        .from(productCombinations)
        .where(ilike(productCombinations.name, `%${q}%`));
      conditions.push(inArray(inventoryMovements.combinationId, matchingCombos));
    } else if (ids && ids.length > 0) {
      conditions.push(inArray(inventoryMovements.combinationId, ids));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ total: count(inventoryMovements.id) })
      .from(inventoryMovements)
      .where(whereClause);

    const total = Number(countResult?.total || 0);

    const rows = await db.query.inventoryMovements.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (tbl, { asc, desc }) => {
        const col = tbl[sort as keyof typeof tbl] || tbl.updatedAt;
        return order.toUpperCase() === "ASC" ? asc(col) : desc(col);
      },
      with: {
        user: {
          columns: { id: true, username: true, name: true, role: true },
        },
        salesOrder: {
          columns: { orderDate: true },
        },
        goodReceipt: {
          columns: { receiptDate: true },
        },
        combination: {
          with: {
            product: true,
          },
        },
      },
    });

    const formattedRows = rows.map((row) => {
      const movement = { ...row } as any;
      let referenceDate = movement.updatedAt;

      if (
        movement.referenceType === "SALES_ORDER" &&
        movement.salesOrder?.orderDate
      ) {
        referenceDate = movement.salesOrder.orderDate;
      } else if (
        movement.referenceType === "GOOD_RECEIPT" &&
        movement.goodReceipt?.receiptDate
      ) {
        referenceDate = movement.goodReceipt.receiptDate;
      }

      delete movement.salesOrder;
      delete movement.goodReceipt;

      return {
        ...movement,
        referenceDate,
      };
    });

    let totalAmount = 0;
    let totalQuantity = 0;

    try {
      const sumConditions = [
        ...(conditions.length ? conditions : []),
        ne(inventoryMovements.type, INVENTORY_MOVEMENT_TYPE.ADJUSTMENT_OUT),
      ];

      const [sumResult] = await db
        .select({
          totalCost: sql<string>`COALESCE(SUM(${inventoryMovements.totalCost}), 0)`,
          quantity: sql<string>`COALESCE(SUM(${inventoryMovements.quantity}), 0)`,
        })
        .from(inventoryMovements)
        .where(and(...sumConditions));

      totalAmount = Number(sumResult?.totalCost || 0);
      totalQuantity = Number(sumResult?.quantity || 0);
    } catch {
      // Fallback
    }

    return {
      data: formattedRows,
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
      summary: {
        totalValue: {
          label: "Total Amount",
          value: totalAmount,
        },
        totalQuantity: {
          label: "Total Quantity",
          value: totalQuantity,
        },
      },
    };
  },

  inventoryIncrease: async (
    item: { combinationId: number; quantity: number; averagePrice?: number },
    type: string,
    referenceId: number | null = null,
    referenceType: string | null = null,
    transaction: any = null,
    userId: number = 1,
  ) => {
    const { combinationId } = item;
    const quantity = truncateQty(item.quantity);
    const averagePrice =
      item.averagePrice !== undefined
        ? truncateQty(item.averagePrice)
        : undefined;


    // Native Drizzle ORM execution
    const runInDrizzle = async (tx: typeof db) => {
      const existing = await tx
        .select()
        .from(inventories)
        .where(eq(inventories.combinationId, combinationId))
        .for("update");

      let currentInv = existing[0];
      let finalInventory: any;

      if (!currentInv) {
        const [inserted] = await tx
          .insert(inventories)
          .values({
            combinationId,
            quantity: String(quantity),
            averagePrice: String(averagePrice ?? 0),
          })
          .returning();
        finalInventory = inserted;
      } else {
        const newQty = truncateQty(Number(currentInv.quantity || 0) + quantity);
        const updateValues: any = {
          quantity: String(newQty),
          updatedAt: new Date(),
        };
        if (averagePrice !== undefined) {
          updateValues.averagePrice = String(averagePrice);
        }
        const [updated] = await tx
          .update(inventories)
          .set(updateValues)
          .where(eq(inventories.id, currentInv.id))
          .returning();
        finalInventory = updated;
      }

      const costPerUnit =
        averagePrice !== undefined
          ? averagePrice
          : Number(finalInventory?.averagePrice || 0);

      await tx.insert(inventoryMovements).values({
        type,
        quantity: String(quantity),
        costPerUnit: String(costPerUnit),
        totalCost: String(truncateQty(quantity * costPerUnit)),
        referenceType,
        referenceId,
        userId,
        combinationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return finalInventory;
    };

    if (transaction) {
      return await runInDrizzle(transaction);
    }
    return await db.transaction(async (tx) => {
      return await runInDrizzle(tx as any);
    });
  },

  inventoryDecrease: async (
    item: { combinationId: number; quantity: number; averagePrice?: number },
    type: string,
    referenceId: number | null = null,
    referenceType: string | null = null,
    transaction: any = null,
    userId: number = 1,
  ) => {
    const { combinationId } = item;
    const quantity = truncateQty(item.quantity);


    // Native Drizzle ORM execution
    const runInDrizzle = async (tx: typeof db) => {
      const existing = await tx
        .select()
        .from(inventories)
        .where(eq(inventories.combinationId, combinationId))
        .for("update");

      const inv = existing[0];
      if (!inv) {
        throw new Error(
          `Inventory not found for combination ID ${combinationId}`,
        );
      }

      const currentQty = truncateQty(Number(inv.quantity || 0));
      const currentPrice = truncateQty(Number(inv.averagePrice || 0));

      if (currentQty < quantity) {
        throw new Error("Not enough inventory");
      }

      const newQuantity = truncateQty(currentQty - quantity);

      await tx.insert(inventoryMovements).values({
        combinationId,
        quantity: String(-quantity),
        costPerUnit: String(currentPrice),
        totalCost: String(-truncateQty(quantity * currentPrice)),
        type,
        userId,
        referenceId,
        referenceType,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updateValues: any = {
        quantity: String(newQuantity),
        updatedAt: new Date(),
      };
      if (item.averagePrice !== undefined) {
        updateValues.averagePrice = String(truncateQty(item.averagePrice));
      }

      const [updated] = await tx
        .update(inventories)
        .set(updateValues)
        .where(eq(inventories.id, inv.id))
        .returning();

      return updated;
    };

    if (transaction) {
      return await runInDrizzle(transaction);
    }
    return await db.transaction(async (tx) => {
      return await runInDrizzle(tx as any);
    });
  },

  getReturnTransaction: async (referenceId: number | string) => {
    return await db.query.returnTransactions.findMany({
      where: (tbl, { eq }) => eq(tbl.referenceId, Number(referenceId)),
    });
  },

  getReturnItems: async (returnTransactionId: number | string) => {
    return await db.query.returnItems.findMany({
      where: (tbl, { eq }) => eq(tbl.returnTransactionId, Number(returnTransactionId)),
      with: {
        combination: {
          with: {
            product: true,
          },
        },
      },
    });
  },

  getReordersLevels: async (params: GetReordersLevelsInput = {}) => {
    const {
      limit = 50,
      page = 1,
      sort = "lastSoldAt",
      order: sortOrder = "DESC",
    } = params;

    const offset = (page - 1) * limit;

    const orderDirection = sortOrder.toUpperCase() === "ASC" ? asc : desc;
    let orderExpression: any = desc(sql`MAX("SalesOrderItems"."updatedAt")`);
    if (sort === "quantity") {
      orderExpression = orderDirection(inventories.quantity);
    } else if (sort === "reorderLevel") {
      orderExpression = orderDirection(productCombinations.reorderLevel);
    } else if (sort === "name") {
      orderExpression = orderDirection(productCombinations.name);
    } else if (sort === "transactionCount") {
      orderExpression = orderDirection(sql`COUNT(DISTINCT "SalesOrderItems"."salesOrderId")`);
    } else {
      orderExpression = orderDirection(sql`MAX("SalesOrderItems"."updatedAt")`);
    }

    const baseQuery = db
      .select({
        id: inventories.id,
        quantity: inventories.quantity,
        combinationId: inventories.combinationId,
        lastSoldAt: sql<Date | null>`MAX("SalesOrderItems"."updatedAt")`.as("lastSoldAt"),
        transactionCount: sql<number>`COUNT(DISTINCT "SalesOrderItems"."salesOrderId")::int`.as("transactionCount"),
        combinationName: productCombinations.name,
        combinationReorderLevel: productCombinations.reorderLevel,
        combinationUnit: productCombinations.unit,
      })
      .from(inventories)
      .innerJoin(
        productCombinations,
        eq(inventories.combinationId, productCombinations.id),
      )
      .innerJoin(
        salesOrderItems,
        eq(productCombinations.id, salesOrderItems.combinationId),
      )
      .innerJoin(
        salesOrders,
        and(
          eq(salesOrderItems.salesOrderId, salesOrders.id),
          eq(salesOrders.status, "RECEIVED"),
        ),
      )
      .where(sql`${inventories.quantity} < ${productCombinations.reorderLevel}`)
      .groupBy(inventories.id, productCombinations.id);

    const rows = await baseQuery
      .orderBy(orderExpression)
      .limit(limit)
      .offset(offset);

    const countQuery = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(baseQuery.as("subquery"));
    const total = countQuery[0]?.count ?? 0;

    const data = rows.map((r: any) => {
      const comboObj = {
        id: r.combinationId,
        name: r.combinationName,
        reorderLevel: r.combinationReorderLevel,
        unit: r.combinationUnit,
      };
      return {
        ...r,
        combinations: comboObj,
        combination: comboObj,
      };
    });

    return {
      data,
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    };
  },
};
