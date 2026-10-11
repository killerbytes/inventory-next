import { getAmount, getTotalAmount } from "@/lib/compute";
import { getMappedVariantValues } from "@/lib/mapped";
import { getNextSequence } from "@/lib/sequence";
import { format } from "date-fns";
import { SalesOrderInput, SalesOrderItemData, SalesOrderData } from "@/schemas";
import { db } from "@/server/db/drizzle";
import { salesOrders } from "@/server/db/schema/salesOrders";
import { salesOrderItems } from "@/server/db/schema/salesOrderItems";
import { orderStatusHistories } from "@/server/db/schema/orderStatusHistories";
import { returnTransactions } from "@/server/db/schema/returnTransactions";
import { returnItems } from "@/server/db/schema/returnItems";
import { customers } from "@/server/db/schema/customers";
import { inventories } from "@/server/db/schema/inventories";
import { inventoryMovements } from "@/server/db/schema/inventoryMovements";
import { productCombinations } from "@/server/db/schema/productCombinations";
import {
  INVENTORY_MOVEMENT_REFERENCE_TYPE,
  INVENTORY_MOVEMENT_TYPE,
  ORDER_STATUS,
  ORDER_TYPE,
  RETURN_TYPE,
} from "@/constants";
import {
  eq,
  and,
  isNull,
  desc,
  asc,
  count,
  inArray,
  notInArray,
  gte,
  lte,
  or,
  ilike,
  sql,
} from "drizzle-orm";
import "server-only";
import { handleServiceError } from "./errorHandler";
import { inventoryServerService } from "./inventoryServer.service";
import { getDateBounds } from "./dateFilter";

export interface ListSalesOrdersParams {
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  status?: string | null;
  customerId?: string | number | null;
  search?: string | null;
  q?: string | null;
  page?: number;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: "ASC" | "DESC" | "asc" | "desc";
}

export interface ReturnExchangeItem {
  combinationId: number;
  quantity: number;
  discount?: number | null;
}

const mappedProductCombinationProps = (productCombination: any) => {
  return {
    unit: productCombination.unit,
    nameSnapshot: productCombination.name,
    categorySnapshot: productCombination.product?.category,
    variantSnapshot: getMappedVariantValues(
      productCombination.product?.variants,
      productCombination.values,
    ),
    skuSnapshot: productCombination.sku,
  };
};

const fetchProductCombinationWithDetails = async (
  combinationId: number,
  tx?: any,
) => {
  const client = tx || db;
  const combo = await client.query.productCombinations.findFirst({
    where: (tbl: any, { eq, and, isNull }: any) =>
      and(eq(tbl.id, combinationId), isNull(tbl.deletedAt)),
    with: {
      product: {
        with: {
          category: true,
          variants: {
            with: {
              values: true,
            },
          },
        },
      },
      combinationValues: {
        with: {
          value: true,
        },
      },
    },
  });

  if (!combo) return null;

  const values = (combo.combinationValues || [])
    .map((cv: any) => cv.value)
    .filter(Boolean);

  return {
    ...combo,
    values,
  };
};

const updateOrder = async (
  payload: any,
  salesOrder: any,
  tx: any,
  updateOrderItems: boolean = false,
) => {
  const items = payload.salesOrderItems || payload.items;
  const updateData: any = {
    ...payload,
  };
  if (items) {
    updateData.totalAmount = String(getTotalAmount(items));
  }
  delete updateData.salesOrderItems;
  delete updateData.items;
  updateData.updatedAt = new Date();

  await tx
    .update(salesOrders)
    .set(updateData)
    .where(eq(salesOrders.id, salesOrder.id));

  if (updateOrderItems && Array.isArray(items)) {
    const payloadIds = items
      .filter((i: any) => i.id)
      .map((i: any) => Number(i.id));

    if (payloadIds.length > 0) {
      await tx
        .delete(salesOrderItems)
        .where(
          and(
            eq(salesOrderItems.salesOrderId, salesOrder.id),
            notInArray(salesOrderItems.id, payloadIds),
          ),
        );
    } else {
      await tx
        .delete(salesOrderItems)
        .where(eq(salesOrderItems.salesOrderId, salesOrder.id));
    }

    let calculatedTotal = 0;
    for (const item of items) {
      const combinationId = Number(item.combinationId || item.productId);
      const productCombination = await fetchProductCombinationWithDetails(
        combinationId,
        tx,
      );

      const mappedProps: any = productCombination
        ? mappedProductCombinationProps(productCombination)
        : {};

      const purchasePrice =
        item.purchasePrice !== undefined
          ? Number(item.purchasePrice)
          : Number(productCombination?.price ?? 0);
      const originalPrice =
        item.originalPrice !== undefined
          ? Number(item.originalPrice)
          : Number(productCombination?.price) || purchasePrice;
      const quantity = Number(item.quantity || 0);
      const discount = Number(item.discount || 0);
      const totalAmount =
        item.totalAmount !== undefined
          ? Number(item.totalAmount)
          : getAmount({ purchasePrice, quantity, discount });

      calculatedTotal += totalAmount;

      const lineData: any = {
        combinationId,
        purchasePrice: String(purchasePrice),
        originalPrice: String(originalPrice),
        quantity: String(quantity),
        discount: String(discount),
        totalAmount: String(totalAmount),
        unit: mappedProps.unit || item.unit || "PCS",
        discountNote: item.discountNote || null,
        skuSnapshot: mappedProps.skuSnapshot || "",
        nameSnapshot: mappedProps.nameSnapshot || "",
        categorySnapshot: mappedProps.categorySnapshot || null,
        variantSnapshot: mappedProps.variantSnapshot || null,
        salesOrderId: salesOrder.id,
        updatedAt: new Date(),
      };

      if (item.id) {
        await tx
          .update(salesOrderItems)
          .set(lineData)
          .where(
            and(
              eq(salesOrderItems.id, Number(item.id)),
              eq(salesOrderItems.salesOrderId, salesOrder.id),
            ),
          );
      } else {
        lineData.createdAt = new Date();
        await tx.insert(salesOrderItems).values(lineData);
      }
    }

    await tx
      .update(salesOrders)
      .set({ totalAmount: String(calculatedTotal), updatedAt: new Date() })
      .where(eq(salesOrders.id, salesOrder.id));
  }
};

const processReceivedOrder = async (
  payload: any,
  salesOrder: any,
  tx: any,
  userId?: number,
  isCreate: boolean = false,
) => {
  const items =
    isCreate && salesOrder.salesOrderItems?.length
      ? salesOrder.salesOrderItems
      : payload.salesOrderItems ||
      payload.items ||
      salesOrder.salesOrderItems ||
      [];

  if (!isCreate) {
    await updateOrder(
      {
        ...payload,
        status: ORDER_STATUS.RECEIVED,
      },
      salesOrder,
      tx,
      true,
    );
  }

  // Validate available inventory
  for (const item of items) {
    const combinationId = Number(item.combinationId || item.productId);
    const inv = await tx.query.inventories.findFirst({
      where: (tbl: any, { eq }: any) => eq(tbl.combinationId, combinationId),
    });
    const available = Number(inv?.quantity || 0);
    const requested = Number(item.quantity || 0);
    if (requested > available) {
      throw new Error(
        `Quantity is greater than inventory for combination ID ${combinationId}: requested ${requested}, available ${available}`,
      );
    }
  }

  // Decrease inventory stock
  for (const item of items) {
    const combinationId = Number(item.combinationId || item.productId);
    const quantity = Number(item.quantity || 0);
    await inventoryServerService.inventoryDecrease(
      {
        combinationId,
        quantity,
      },
      INVENTORY_MOVEMENT_TYPE.OUT,
      salesOrder.id,
      INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER,
      tx,
      userId ?? 1,
    );
  }

  if (!isCreate) {
    await tx.insert(orderStatusHistories).values({
      salesOrderId: salesOrder.id,
      status: ORDER_STATUS.RECEIVED,
      changedBy: userId ?? 1,
      changedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
};

const processCompletedOrder = async (
  payload: any,
  salesOrder: any,
  tx: any,
  userId?: number,
) => {
  await updateOrder(
    {
      ...payload,
      status: ORDER_STATUS.COMPLETED,
    },
    salesOrder,
    tx,
    false,
  );

  await tx.insert(orderStatusHistories).values({
    salesOrderId: salesOrder.id,
    status: ORDER_STATUS.COMPLETED,
    changedBy: userId ?? 1,
    changedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const getSummary = async (
  whereClause: any,
  startBound?: Date,
  endBound?: Date,
) => {
  const [totalSumResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${salesOrders.totalAmount}), 0)` })
    .from(salesOrders)
    .where(
      and(
        whereClause,
        inArray(salesOrders.status, [
          ORDER_STATUS.RECEIVED,
          ORDER_STATUS.COMPLETED,
        ]),
      ),
    );
  const totalAmount = Number(totalSumResult?.total || 0);

  const matchingOrders = await db
    .select({ id: salesOrders.id })
    .from(salesOrders)
    .where(whereClause);
  const orderIds = matchingOrders.map((o) => o.id);

  let totalReturnAmount = 0;
  let totalExchangeAmount = 0;
  if (orderIds.length > 0) {
    const [returnsSumResult] = await db
      .select({
        totalReturn: sql<string>`COALESCE(SUM(${returnTransactions.totalReturnAmount}), 0)`,
        totalExchange: sql<string>`COALESCE(SUM(${returnTransactions.totalExchangeAmount}), 0)`,
      })
      .from(returnTransactions)
      .where(
        and(
          inArray(returnTransactions.referenceId, orderIds),
          eq(returnTransactions.sourceType, ORDER_TYPE.SALE),
        ),
      );
    totalReturnAmount = Number(returnsSumResult?.totalReturn || 0);
    totalExchangeAmount = Number(returnsSumResult?.totalExchange || 0);
  }

  const costConditions: any[] = [
    eq(
      inventoryMovements.referenceType,
      INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER,
    ),
    inArray(salesOrders.status, [
      ORDER_STATUS.RECEIVED,
      ORDER_STATUS.COMPLETED,
    ]),
  ];
  if (startBound) {
    costConditions.push(gte(salesOrders.orderDate, startBound));
  }
  if (endBound) {
    costConditions.push(lte(salesOrders.orderDate, endBound));
  }

  const [costResult] = await db
    .select({
      totalCost: sql<string>`COALESCE(SUM(${inventoryMovements.totalCost}), 0)`,
    })
    .from(inventoryMovements)
    .innerJoin(salesOrders, eq(salesOrders.id, inventoryMovements.referenceId))
    .where(and(...costConditions));

  const totalCost = Number(costResult?.totalCost || 0);
  const netAmount = totalAmount - totalReturnAmount + totalExchangeAmount;

  return {
    totalAmount: netAmount,
    totalProfitAmount: netAmount + totalCost,
    totalReturnAmount,
    totalExchangeAmount,
  };
};

export const salesServerService = {
  get: async (id: number, tx?: any): Promise<SalesOrderData | null> => {
    const client = tx || db;
    const order = await client.query.salesOrders.findFirst({
      where: (tbl: any, { eq, and, isNull }: any) =>
        and(eq(tbl.id, id), isNull(tbl.deletedAt)),
      with: {
        customer: true,
        salesOrderItems: {
          where: (tbl: any, { isNull }: any) => isNull(tbl.deletedAt),
          orderBy: (tbl: any, { asc }: any) => asc(tbl.id),
          with: {
            combination: true,
          },
        },
        salesOrderStatusHistory: {
          orderBy: (tbl: any, { desc }: any) => desc(tbl.id),
          with: {
            user: true,
          },
        },
        returnTransactions: {
          where: (tbl: any, { eq }: any) => eq(tbl.sourceType, ORDER_TYPE.SALE),
          with: {
            returnItems: {
              with: {
                combination: true,
              },
            },
          },
        },
      },
    });

    if (!order) return null;

    const items = (order.salesOrderItems || []).map((item: any) => ({
      ...item,
      combination: item.combination,
      combinations: item.combination,
    }));

    return {
      ...order,
      salesOrderItems: items,
    } as unknown as SalesOrderData;
  },

  getAll: async (params: ListSalesOrdersParams = {}) => {
    const {
      startDate,
      endDate,
      status,
      customerId,
      sort = "orderDate",
      order = "DESC",
    } = params;

    const limit = Number(params.limit) || 50;
    const page =
      Number(params.page) ||
      (params.offset !== undefined
        ? Math.floor(params.offset / limit) + 1
        : 1);
    const offset =
      params.offset !== undefined
        ? Number(params.offset)
        : (page - 1) * limit;

    const search = params.q ?? params.search;
    const conditions: any[] = [isNull(salesOrders.deletedAt)];

    const { startBound, endBound } = getDateBounds(startDate, endDate);
    if (startBound) {
      conditions.push(gte(salesOrders.orderDate, startBound));
    }
    if (endBound) {
      conditions.push(lte(salesOrders.orderDate, endBound));
    }

    if (status) {
      conditions.push(eq(salesOrders.status, status));
    }

    if (customerId) {
      conditions.push(eq(salesOrders.customerId, Number(customerId)));
    }

    if (search) {
      conditions.push(
        or(
          ilike(salesOrders.salesOrderNumber, `%${search}%`),
          ilike(salesOrders.status, `%${search}%`),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ total: count(salesOrders.id) })
      .from(salesOrders)
      .where(whereClause);

    const total = Number(countResult?.total || 0);

    let rows: any[] = [];
    const orderDir = order.toUpperCase() === "ASC" ? asc : desc;

    if (sort === "customer.name") {
      const sortedOrders = await db
        .select({ id: salesOrders.id })
        .from(salesOrders)
        .leftJoin(customers, eq(salesOrders.customerId, customers.id))
        .where(whereClause)
        .orderBy(orderDir(customers.name), desc(salesOrders.id))
        .limit(limit)
        .offset(offset);

      const sortedIds = sortedOrders.map((r) => r.id);
      if (sortedIds.length > 0) {
        const fetched = await db.query.salesOrders.findMany({
          where: (tbl: any, { inArray }: any) => inArray(tbl.id, sortedIds),
          with: {
            customer: true,
            salesOrderItems: {
              where: (tbl: any, { isNull }: any) => isNull(tbl.deletedAt),
              orderBy: (tbl: any, { asc }: any) => asc(tbl.id),
              with: {
                combination: true,
              },
            },
            salesOrderStatusHistory: {
              orderBy: (tbl: any, { desc }: any) => desc(tbl.id),
              with: {
                user: true,
              },
            },
            returnTransactions: {
              where: (tbl: any, { eq }: any) =>
                eq(tbl.sourceType, ORDER_TYPE.SALE),
              with: {
                returnItems: {
                  with: {
                    combination: true,
                  },
                },
              },
            },
          },
        });
        const orderMap = new Map(fetched.map((o: any) => [o.id, o]));
        rows = sortedIds.map((id) => orderMap.get(id)!).filter(Boolean);
      }
    } else {
      const allowedSortFields = new Set([
        "id",
        "salesOrderNumber",
        "customerId",
        "status",
        "orderDate",
        "totalAmount",
        "createdAt",
        "updatedAt",
      ]);
      const validSort = allowedSortFields.has(sort) ? sort : "id";
      const orderColumn =
        salesOrders[validSort as keyof typeof salesOrders] || salesOrders.id;

      rows = await db.query.salesOrders.findMany({
        where: whereClause,
        orderBy: [orderDir(orderColumn as any), desc(salesOrders.id)],
        limit,
        offset,
        with: {
          customer: true,
          salesOrderItems: {
            where: (tbl: any, { isNull }: any) => isNull(tbl.deletedAt),
            orderBy: (tbl: any, { asc }: any) => asc(tbl.id),
            with: {
              combination: true,
            },
          },
          salesOrderStatusHistory: {
            orderBy: (tbl: any, { desc }: any) => desc(tbl.id),
            with: {
              user: true,
            },
          },
          returnTransactions: {
            where: (tbl: any, { eq }: any) =>
              eq(tbl.sourceType, ORDER_TYPE.SALE),
            with: {
              returnItems: {
                with: {
                  combination: true,
                },
              },
            },
          },
        },
      });
    }

    const mappedRows = rows.map((order: any) => ({
      ...order,
      salesOrderItems: (order.salesOrderItems || []).map((item: any) => ({
        ...item,
        combination: item.combination,
        combinations: item.combination,
      })),
    }));

    const meta = {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };

    return {
      data: mappedRows as unknown as SalesOrderData[],
      rows: mappedRows as unknown as SalesOrderData[],
      meta,
      pagination: meta,
      summary: await getSummary(whereClause, startBound, endBound),
    };
  },

  getPaginated: async (params: ListSalesOrdersParams = {}) => {
    return await salesServerService.getAll(params);
  },

  getDailySales: async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    const sales = await db
      .select({
        orderDate: salesOrders.orderDate,
        totalAmount: salesOrders.totalAmount,
      })
      .from(salesOrders)
      .where(
        and(
          inArray(salesOrders.status, ["RECEIVED", "COMPLETED", "POSTED"]),
          gte(salesOrders.orderDate, startDate),
          isNull(salesOrders.deletedAt),
        ),
      );

    const days: { name: string; totalAmount: number; fullDate: string }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const fullDate = d.toISOString().split("T")[0];
      const name = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      days.push({ name, totalAmount: 0, fullDate });
    }

    sales.forEach((sale) => {
      const dateStr = sale.orderDate
        ? new Date(sale.orderDate).toISOString().split("T")[0]
        : "";
      const match = days.find((r) => r.fullDate === dateStr);
      if (match) {
        match.totalAmount += parseFloat(String(sale.totalAmount || 0));
      }
    });

    return days.map((r) => ({ name: r.name, totalAmount: r.totalAmount }));
  },

  create: async (data: SalesOrderInput, userId?: number) => {
    try {
      return await db.transaction(async (tx) => {
        const rawItems = data.salesOrderItems || [];
        const status = data.status || ORDER_STATUS.DRAFT;

        const processedItems = await Promise.all(
          rawItems.map(async (item) => {
            const combinationId = Number(item.combinationId);
            const productCombination = await fetchProductCombinationWithDetails(
              combinationId,
              tx,
            );

            if (!productCombination) {
              throw new Error("Product Combination not found");
            }

            if (Number(productCombination.price) <= 0) {
              throw new Error(
                `Product "${productCombination.name}" price is not set. Please set the product price first.`,
              );
            }

            const purchasePrice = Number(productCombination.price);
            const originalPrice = Number(productCombination.price);
            const quantity = Number(item.quantity || 0);
            const discount = Number(item.discount || 0);
            const totalAmount = getAmount({
              purchasePrice,
              quantity,
              discount,
            });

            return {
              ...item,
              combinationId,
              purchasePrice,
              originalPrice,
              quantity,
              discount,
              totalAmount,
              ...mappedProductCombinationProps(productCombination),
            };
          }),
        );

        const totalAmount = getTotalAmount(processedItems);
        console.log(213, totalAmount);
        let salesOrderNumber = data.salesOrderNumber;
        if (!salesOrderNumber) {
          const currentYearMonth = format(new Date(), "yyyy-MM");
          const nextval = await getNextSequence("sales_order_seq");
          salesOrderNumber = `SO-${currentYearMonth}-${String(nextval).padStart(4, "0")}`;
        }

        const [order] = await tx
          .insert(salesOrders)
          .values({
            salesOrderNumber,
            customerId: data.customerId ? Number(data.customerId) : null,
            status,
            orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
            isDelivery: data.isDelivery ?? false,
            isDeliveryCompleted: (data as any).isDeliveryCompleted,
            deliveryAddress: data.deliveryAddress,
            deliveryInstructions: data.deliveryInstructions,
            deliveryDate: data.deliveryDate
              ? new Date(data.deliveryDate)
              : null,
            cancellationReason: (data as any).cancellationReason,
            totalAmount: String(totalAmount),
            notes: data.notes,
            internalNotes: data.internalNotes,
            modeOfPayment: data.modeOfPayment || "CASH",
            checkNumber: data.checkNumber,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        for (const item of processedItems) {
          await tx.insert(salesOrderItems).values({
            salesOrderId: order.id,
            combinationId: item.combinationId,
            quantity: String(item.quantity),
            originalPrice: String(item.originalPrice),
            purchasePrice: String(item.purchasePrice),
            totalAmount: String(item.totalAmount),
            discount: String(item.discount || 0),
            unit: item.unit || "PCS",
            discountNote: item.discountNote,
            skuSnapshot: item.skuSnapshot || "",
            nameSnapshot: item.nameSnapshot || "",
            categorySnapshot: item.categorySnapshot,
            variantSnapshot: item.variantSnapshot,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        await tx.insert(orderStatusHistories).values({
          salesOrderId: order.id,
          status,
          changedBy: userId ?? 1,
          changedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(333);
        if (status === ORDER_STATUS.RECEIVED) {
          await processReceivedOrder(data, order, tx, userId, true);
        }

        return await salesServerService.get(order.id, tx);
      });
    } catch (error) {

      handleServiceError(error);
    }
  },

  update: async (id: number, data: any, userId?: number) => {
    return await db.transaction(async (tx) => {
      const salesOrder = await tx.query.salesOrders.findFirst({
        where: (tbl: any, { eq, and, isNull }: any) =>
          and(eq(tbl.id, id), isNull(tbl.deletedAt)),
        with: {
          salesOrderItems: true,
        },
      });

      if (!salesOrder) {
        throw new Error("SalesOrder not found");
      }

      switch (true) {
        case salesOrder.status === ORDER_STATUS.DRAFT &&
          data.status === ORDER_STATUS.RECEIVED:
          await processReceivedOrder(data, salesOrder, tx, userId);
          break;
        case salesOrder.status === ORDER_STATUS.RECEIVED &&
          data.status === ORDER_STATUS.COMPLETED:
          await processCompletedOrder(data, salesOrder, tx, userId);
          break;
        case salesOrder.status === ORDER_STATUS.DRAFT &&
          (data.status === ORDER_STATUS.DRAFT || !data.status):
          await updateOrder(data, salesOrder, tx, true);
          break;
        default:
          throw new Error(
            `Invalid status change from ${salesOrder.status} to ${data.status}`,
          );
      }

      return await salesServerService.get(id, tx);
    });
  },

  delete: async (id: number, userId?: number) => {
    return await db.transaction(async (tx) => {
      const salesOrder = await tx.query.salesOrders.findFirst({
        where: (tbl: any, { eq, and, isNull }: any) =>
          and(eq(tbl.id, id), isNull(tbl.deletedAt)),
      });

      if (!salesOrder) {
        throw new Error("SalesOrder not found");
      }

      if (salesOrder.status !== ORDER_STATUS.DRAFT) {
        throw new Error("SalesOrder is not in a valid state");
      }

      await updateOrder(
        {
          status: ORDER_STATUS.VOID,
        },
        salesOrder,
        tx,
        false,
      );

      await tx.insert(orderStatusHistories).values({
        salesOrderId: salesOrder.id,
        status: ORDER_STATUS.VOID,
        changedBy: userId ?? 1,
        changedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return await salesServerService.get(id, tx);
    });
  },

  cancelOrder: async (
    id: number,
    payload?: { reason?: string } | string,
    userId?: number,
  ) => {
    const reason = typeof payload === "string" ? payload : payload?.reason;
    return await db.transaction(async (tx) => {
      const salesOrder = await tx.query.salesOrders.findFirst({
        where: (tbl: any, { eq, and, isNull }: any) =>
          and(eq(tbl.id, id), isNull(tbl.deletedAt)),
        with: {
          salesOrderItems: true,
          returnTransactions: true,
        },
      });

      if (!salesOrder) {
        throw new Error("Sales order not found");
      }

      if (
        salesOrder.status === ORDER_STATUS.CANCELLED ||
        salesOrder.status === "VOID"
      ) {
        throw new Error("SalesOrder is not in a valid state to be cancelled");
      }

      const returnTxs = salesOrder.returnTransactions || [];
      if (returnTxs.length > 0) {
        throw new Error(
          "Cannot cancel order with existing return transactions",
        );
      }

      await tx
        .update(salesOrders)
        .set({
          status: ORDER_STATUS.CANCELLED,
          cancellationReason: reason || "Order cancelled by user",
          updatedAt: new Date(),
        })
        .where(eq(salesOrders.id, salesOrder.id));

      const salesMovements = await tx.query.inventoryMovements.findMany({
        where: (tbl: any, { eq, and }: any) =>
          and(
            eq(tbl.referenceId, salesOrder.id),
            eq(
              tbl.referenceType,
              INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER,
            ),
            eq(tbl.type, INVENTORY_MOVEMENT_TYPE.OUT),
          ),
      });

      for (const movement of salesMovements) {
        await inventoryServerService.inventoryIncrease(
          {
            combinationId: movement.combinationId!,
            quantity: Math.abs(Number(movement.quantity)),
          },
          INVENTORY_MOVEMENT_TYPE.CANCELLATION,
          salesOrder.id,
          INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER,
          tx,
          userId ?? 1,
        );
      }

      await tx.insert(orderStatusHistories).values({
        salesOrderId: salesOrder.id,
        status: ORDER_STATUS.CANCELLED,
        changedBy: userId ?? 1,
        changedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return await salesServerService.get(salesOrder.id, tx);
    });
  },

  returnExchange: async (
    referenceId: number,
    returns: ReturnExchangeItem[] = [],
    exchanges: ReturnExchangeItem[] = [],
    reason: string = "Customer Return",
  ) => {
    return await db.transaction(async (tx) => {
      const salesOrder = await tx.query.salesOrders.findFirst({
        where: (tbl: any, { eq, and, isNull }: any) =>
          and(eq(tbl.id, referenceId), isNull(tbl.deletedAt)),
        with: {
          salesOrderItems: true,
        },
      });

      if (!salesOrder) {
        throw new Error("Sales order not found");
      }

      if (
        salesOrder.status !== ORDER_STATUS.COMPLETED &&
        salesOrder.status !== ORDER_STATUS.RECEIVED
      ) {
        throw new Error("SalesOrder is not in a valid state");
      }

      let totalReturnAmount = 0;
      let totalExchangeAmount = 0;

      const [returnTx] = await tx
        .insert(returnTransactions)
        .values({
          sourceType: ORDER_TYPE.SALE,
          referenceId,
          totalReturnAmount: "0",
          totalExchangeAmount: "0",
          paymentDifference: "0",
          type:
            exchanges.length > 0
              ? INVENTORY_MOVEMENT_TYPE.EXCHANGE_IN
              : INVENTORY_MOVEMENT_TYPE.RETURN_IN,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Process Returns
      for (const ret of returns) {
        const orderItem = (salesOrder.salesOrderItems || []).find(
          (item: any) =>
            Number(item.combinationId) === Number(ret.combinationId),
        );

        const itemQty = Number(orderItem?.quantity || 1);
        const discount = Number(orderItem?.discount || 0);
        const originalPrice = Number(orderItem?.originalPrice || 0);
        const discountPerItem = discount / itemQty;
        const unitPrice = originalPrice - discountPerItem;
        const totalAmount = unitPrice * ret.quantity;

        totalReturnAmount += totalAmount;

        await tx.insert(returnItems).values({
          returnTransactionId: returnTx.id,
          combinationId: ret.combinationId,
          quantity: String(ret.quantity),
          unitPrice: String(unitPrice),
          totalAmount: String(totalAmount),
          type: RETURN_TYPE.RETURN_IN,
          reason,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await inventoryServerService.inventoryIncrease(
          {
            combinationId: ret.combinationId,
            quantity: ret.quantity,
          },
          INVENTORY_MOVEMENT_TYPE.RETURN_IN,
          salesOrder.id,
          INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER,
          tx,
        );
      }

      // Process Exchanges
      for (const ex of exchanges) {
        const replaceCombo = await tx.query.productCombinations.findFirst({
          where: (tbl: any, { eq, and, isNull }: any) =>
            and(eq(tbl.id, ex.combinationId), isNull(tbl.deletedAt)),
        });

        if (!replaceCombo) {
          throw new Error(`Replacement item ${ex.combinationId} not found`);
        }

        const price = Number(replaceCombo.price || 0);
        totalExchangeAmount += price * ex.quantity;

        await tx.insert(returnItems).values({
          returnTransactionId: returnTx.id,
          combinationId: ex.combinationId,
          quantity: String(ex.quantity),
          unitPrice: String(price),
          totalAmount: String(price * ex.quantity),
          type: RETURN_TYPE.EXCHANGE_IN,
          reason: `Exchange for returned goods: ${reason}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await inventoryServerService.inventoryDecrease(
          {
            combinationId: ex.combinationId,
            quantity: ex.quantity,
          },
          INVENTORY_MOVEMENT_TYPE.EXCHANGE_OUT,
          salesOrder.id,
          INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER,
          tx,
        );
      }

      const paymentDifference = totalExchangeAmount - totalReturnAmount;

      await tx
        .update(returnTransactions)
        .set({
          totalReturnAmount: String(totalReturnAmount),
          totalExchangeAmount: String(totalExchangeAmount),
          paymentDifference: String(paymentDifference),
          updatedAt: new Date(),
        })
        .where(eq(returnTransactions.id, returnTx.id));

      return {
        returnTransaction: returnTx,
        totalReturnAmount,
        totalExchangeAmount,
        paymentDifference,
      };
    });
  },
};
