import { getAmount, getTotalAmount, normalize } from "@/lib/compute";
import { getMappedVariantValues } from "@/lib/mapped";
import { GoodReceiptData, GoodReceiptInput } from "@/schemas";
import { db } from "@/server/db/drizzle";
import {
  goodReceipts,
  goodReceiptLines,
  orderStatusHistories,
  returnTransactions,
  returnItems,
  inventories,
  suppliers,
} from "@/server/db/schema";
import {
  INVENTORY_MOVEMENT_REFERENCE_TYPE,
  INVENTORY_MOVEMENT_TYPE,
  ORDER_STATUS,
  ORDER_TYPE,
  PAGINATION,
  RETURN_TYPE,
} from "@/constants";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import "server-only";
import { getDateBounds } from "./dateFilter";
import { handleServiceError } from "./errorHandler";
import { inventoryServerService } from "./inventoryServer.service";
import { ReturnExchangeItem } from "./salesServer.service";

export interface ListGoodReceiptsParams {
  startDate?: string | null;
  endDate?: string | null;
  supplierId?: string | number | null;
  search?: string | null;
  status?: string | null;
  limit?: number;
  offset?: number;
  page?: number;
  sort?: string;
  order?: "ASC" | "DESC" | string;
}

export interface CreateGoodReceiptLineInput {
  combinationId?: number;
  productId?: number;
  quantity?: number;
  quantityReceived?: number;
  purchasePrice?: number;
  unitCost?: number;
  discount?: number;
  totalAmount?: number;
  unit?: string;
  skuSnapshot?: string;
  nameSnapshot?: string;
  categorySnapshot?: any;
  variantSnapshot?: any;
}



const mappedProductCombinationProps = (productCombination: any) => {
  const values = (productCombination.combinationValues || [])
    .map((cv: any) => cv.value)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.variantTypeId || 0) - (b.variantTypeId || 0));

  return {
    unit: productCombination.unit,
    nameSnapshot: productCombination.name,
    categorySnapshot: productCombination.product?.category || null,
    variantSnapshot: getMappedVariantValues(
      productCombination.product?.variants,
      values,
    ),
    skuSnapshot: productCombination.sku,
  };
};

const fetchProductCombinationWithDetails = async (combinationId: number) => {
  return await db.query.productCombinations.findFirst({
    where: (tbl, { eq }) => eq(tbl.id, combinationId),
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
};

const updateOrder = async (
  payload: any,
  goodReceipt: any,
  tx: typeof db,
  updateOrderItems: boolean = false,
) => {
  const updateData: any = { ...payload };
  if (payload.goodReceiptLines) {
    updateData.totalAmount = String(getTotalAmount(payload.goodReceiptLines));
  }
  delete updateData.goodReceiptLines;
  updateData.updatedAt = new Date();

  await tx
    .update(goodReceipts)
    .set(updateData)
    .where(eq(goodReceipts.id, goodReceipt.id));

  if (updateOrderItems && Array.isArray(payload.goodReceiptLines)) {
    const payloadIds = payload.goodReceiptLines
      .filter((i: any) => i.id)
      .map((i: any) => Number(i.id));

    // Soft-delete removed lines belonging to this receipt
    if (payloadIds.length > 0) {
      await tx
        .update(goodReceiptLines)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(goodReceiptLines.goodReceiptId, goodReceipt.id),
            notInArray(goodReceiptLines.id, payloadIds),
            isNull(goodReceiptLines.deletedAt),
          ),
        );
    } else {
      await tx
        .update(goodReceiptLines)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(goodReceiptLines.goodReceiptId, goodReceipt.id),
            isNull(goodReceiptLines.deletedAt),
          ),
        );
    }

    for (const item of payload.goodReceiptLines) {
      const productCombination = await fetchProductCombinationWithDetails(
        item.combinationId,
      );

      const mappedProps = productCombination
        ? mappedProductCombinationProps(productCombination)
        : {};

      const lineData: any = {
        combinationId: item.combinationId,
        quantity: String(item.quantity || 0),
        purchasePrice: String(item.purchasePrice || 0),
        totalAmount: String(getAmount(item)),
        discount: String(item.discount || 0),
        discountNote: item.discountNote || null,
        ...mappedProps,
        updatedAt: new Date(),
      };

      if (item.id) {
        // IDOR protection: only update line if it belongs to this goodReceipt
        await tx
          .update(goodReceiptLines)
          .set(lineData)
          .where(
            and(
              eq(goodReceiptLines.id, item.id),
              eq(goodReceiptLines.goodReceiptId, goodReceipt.id),
              isNull(goodReceiptLines.deletedAt),
            ),
          );
      } else {
        await tx.insert(goodReceiptLines).values({
          ...lineData,
          goodReceiptId: goodReceipt.id,
          createdAt: new Date(),
        });
      }
    }
  }
};

const processReceivedOrder = async (
  payload: any,
  goodReceipt: any,
  tx: typeof db,
  userId?: number,
) => {
  await updateOrder(
    {
      ...payload,
      status: ORDER_STATUS.RECEIVED,
    },
    goodReceipt,
    tx,
    true,
  );

  const linesToProcess =
    payload.goodReceiptLines && payload.goodReceiptLines.length > 0
      ? payload.goodReceiptLines
      : goodReceipt.goodReceiptLines || [];

  for (const item of linesToProcess) {
    const { combinationId, quantity, purchasePrice, discount = 0 } = item;

    const [inventory] = await tx
      .select()
      .from(inventories)
      .where(eq(inventories.combinationId, combinationId))
      .for("update");

    if (!inventory) {
      throw new Error("Inventory not found");
    }

    const qty = Number(quantity || 0);
    const price = Number(purchasePrice || 0);
    const disc = Number(discount || 0);

    const oldQty = Number(inventory.quantity || 0);
    const oldPrice = Number(inventory.averagePrice || 0);
    const newQty = oldQty + qty;
    const priceAfterDiscount = qty > 0 ? (qty * price - disc) / qty : price;

    const averagePrice =
      newQty > 0
        ? (oldQty * oldPrice + qty * priceAfterDiscount) / newQty
        : price;

    await inventoryServerService.inventoryIncrease(
      {
        combinationId,
        quantity: qty,
        averagePrice: normalize(averagePrice),
      },
      INVENTORY_MOVEMENT_TYPE.IN,
      goodReceipt.id,
      INVENTORY_MOVEMENT_REFERENCE_TYPE.GOOD_RECEIPT,
      tx,
    );
  }

  await tx.insert(orderStatusHistories).values({
    goodReceiptId: goodReceipt.id,
    status: ORDER_STATUS.RECEIVED,
    changedBy: userId ?? 1,
    changedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const processUpdateOrder = async (
  payload: any,
  goodReceipt: any,
  tx: typeof db,
) => {
  await updateOrder(payload, goodReceipt, tx, true);
};

const getSummary = async (whereCondition: any) => {
  const [totalSumResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${goodReceipts.totalAmount}), 0)` })
    .from(goodReceipts)
    .where(
      and(
        whereCondition,
        notInArray(goodReceipts.status, [ORDER_STATUS.DRAFT, ORDER_STATUS.VOID]),
        isNull(goodReceipts.deletedAt),
      ),
    );
  const totalAmount = Number(totalSumResult?.total || 0);

  const [totalPaidResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${goodReceipts.totalAmount}), 0)` })
    .from(goodReceipts)
    .where(
      and(
        whereCondition,
        eq(goodReceipts.status, ORDER_STATUS.COMPLETED),
        isNull(goodReceipts.deletedAt),
      ),
    );
  const totalPaid = Number(totalPaidResult?.total || 0);

  const matchingOrders = await db
    .select({ id: goodReceipts.id })
    .from(goodReceipts)
    .where(and(whereCondition, isNull(goodReceipts.deletedAt)));
  const orderIds = matchingOrders.map((o) => o.id);

  let totalReturnAmount = 0;
  if (orderIds.length > 0) {
    const [returnsSumResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${returnTransactions.totalReturnAmount}), 0)` })
      .from(returnTransactions)
      .where(
        and(
          inArray(returnTransactions.referenceId, orderIds),
          eq(returnTransactions.sourceType, ORDER_TYPE.PURCHASE),
        ),
      );
    totalReturnAmount = Number(returnsSumResult?.total || 0);
  }

  return {
    totalAmount: totalAmount - totalReturnAmount,
    totalPayableAmount: totalAmount - totalPaid,
    totalReturnAmount: totalReturnAmount,
  };
};

export const goodReceiptServerService = {
  get: async (id: number) => {
    const receipt = await db.query.goodReceipts.findFirst({
      where: (tbl, { eq, and, isNull }) =>
        and(eq(tbl.id, id), isNull(tbl.deletedAt)),
      with: {
        supplier: true,
        goodReceiptLines: {
          where: (tbl, { isNull }) => isNull(tbl.deletedAt),
          orderBy: (tbl, { asc }) => asc(tbl.id),
          with: {
            combination: true,
          },
        },
        goodReceiptStatusHistory: {
          orderBy: (tbl, { desc }) => desc(tbl.id),
          with: {
            user: true,
          },
        },
        returnTransactions: {
          where: (tbl, { eq }) => eq(tbl.sourceType, ORDER_TYPE.PURCHASE),
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

    return (receipt as unknown as GoodReceiptData) ?? null;
  },

  getAll: async (params: ListGoodReceiptsParams = {}) => {
    const {
      startDate,
      endDate,
      supplierId,
      search,
      status,
    } = params;
    const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
    const page =
      Number(params.page) ||
      (params.offset !== undefined
        ? Math.floor(params.offset / limit) + 1
        : 1);
    const offset =
      params.offset !== undefined
        ? Number(params.offset)
        : (page - 1) * limit;

    const sort = params.sort || "receiptDate";
    const order = params.order || "DESC";
    const conditions = [isNull(goodReceipts.deletedAt)];

    const { startBound, endBound } = getDateBounds(startDate, endDate);
    if (startBound) {
      conditions.push(gte(goodReceipts.receiptDate, startBound));
    }
    if (endBound) {
      conditions.push(lte(goodReceipts.receiptDate, endBound));
    }

    if (supplierId) {
      conditions.push(eq(goodReceipts.supplierId, Number(supplierId)));
    }

    if (status) {
      conditions.push(eq(goodReceipts.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(goodReceipts.referenceNo, `%${search}%`),
          ilike(goodReceipts.status, `%${search}%`),
        )!,
      );
    }

    const allowedSortFields = new Set([
      "id",
      "supplierId",
      "status",
      "receiptDate",
      "referenceNo",
      "totalAmount",
      "createdAt",
      "updatedAt",
      "supplier.name",
    ]);
    const validSort = allowedSortFields.has(sort) ? sort : "receiptDate";
    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ total: count(goodReceipts.id) })
      .from(goodReceipts)
      .where(whereClause);

    const total = Number(countResult?.total || 0);

    let rows: any[];
    if (validSort === "supplier.name") {
      const orderDir = order.toUpperCase() === "ASC" ? asc : desc;
      const sortedReceipts = await db
        .select({ id: goodReceipts.id })
        .from(goodReceipts)
        .leftJoin(suppliers, eq(goodReceipts.supplierId, suppliers.id))
        .where(whereClause)
        .orderBy(orderDir(suppliers.name), desc(goodReceipts.id))
        .limit(limit)
        .offset(offset);

      const sortedIds = sortedReceipts.map((r) => r.id);
      console.log(sortedIds);
      if (sortedIds.length > 0) {
        const fetchedRows = await db.query.goodReceipts.findMany({
          where: inArray(goodReceipts.id, sortedIds),
          with: {
            supplier: true,
            goodReceiptLines: {
              where: (tbl, { isNull }) => isNull(tbl.deletedAt),
              orderBy: (tbl, { asc }) => asc(tbl.id),
              with: {
                combination: true,
              },
            },
            goodReceiptStatusHistory: {
              orderBy: (tbl, { desc }) => desc(tbl.id),
              with: {
                user: true,
              },
            },
            returnTransactions: {
              where: (tbl, { eq }) => eq(tbl.sourceType, ORDER_TYPE.PURCHASE),
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
        rows = sortedIds.map((id) => fetchedRows.find((r) => r.id === id)!);
      } else {
        rows = [];
      }
    } else {
      rows = await db.query.goodReceipts.findMany({
        where: whereClause,
        limit,
        offset,
        orderBy: (tbl, { asc, desc }) => {
          const col = tbl[validSort as keyof typeof tbl] || tbl.receiptDate;
          return order.toUpperCase() === "ASC" ? asc(col) : desc(col);
        },
        with: {
          supplier: true,
          goodReceiptLines: {
            where: (tbl, { isNull }) => isNull(tbl.deletedAt),
            orderBy: (tbl, { asc }) => asc(tbl.id),
            with: {
              combination: true,
            },
          },
          goodReceiptStatusHistory: {
            orderBy: (tbl, { desc }) => desc(tbl.id),
            with: {
              user: true,
            },
          },
          returnTransactions: {
            where: (tbl, { eq }) => eq(tbl.sourceType, ORDER_TYPE.PURCHASE),
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

    const meta = {
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    };

    return {
      data: rows,
      pagination: meta,
      meta,
      summary: await getSummary(whereClause),
    };
  },

  getByProductCombination: async (list: (number | string)[]) => {
    const result: any[] = [];
    for (const id of list) {
      const grLine = await db.query.goodReceiptLines.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, Number(id)), isNull(tbl.deletedAt)),
        with: {
          combination: true,
        },
      });

      if (grLine) {
        const purchasePrice = Number(grLine.purchasePrice || 0);
        const quantity = Number(grLine.quantity || 1);
        const totalAmount = Number(grLine.totalAmount || 0);
        const combo = (grLine as any).combination || {};

        result.push({
          id: grLine.id,
          comboId: grLine.combinationId,
          purchasePrice,
          unitPrice: quantity > 0 ? totalAmount / quantity : purchasePrice,
          quantity,
          price: Number(combo.price || 0),
        });
      }
    }
    return result;
  },

  create: async (data: GoodReceiptInput, userId: number) => {
    try {
      return await db.transaction(async (tx) => {
        const rawLines = data.goodReceiptLines || [];
        const totalAmount = getTotalAmount(rawLines);

        const processedItems = await Promise.all(
          rawLines.map(async (item) => {
            const productCombination = await fetchProductCombinationWithDetails(
              item.combinationId,
            );

            if (!productCombination) {
              throw new Error("Product Combination not found");
            }

            return {
              ...item,
              totalAmount: getAmount(item),
              ...mappedProductCombinationProps(productCombination),
            };
          }),
        );

        const [receipt] = await tx
          .insert(goodReceipts)
          .values({
            supplierId: data.supplierId,
            receiptDate: new Date(data.receiptDate),
            referenceNo: data.referenceNo,
            internalNotes: data.internalNotes,
            totalAmount: String(totalAmount),
            status: ORDER_STATUS.DRAFT,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const createdLines: any[] = [];
        if (processedItems.length > 0) {
          const inserted = await tx
            .insert(goodReceiptLines)
            .values(
              processedItems.map((line) => ({
                goodReceiptId: receipt.id,
                combinationId: line.combinationId,
                quantity: String(line.quantity || 0),
                purchasePrice: String(line.purchasePrice || 0),
                totalAmount: String(line.totalAmount || 0),
                discount: String(line.discount || 0),
                discountNote: line.discountNote || null,
                unit: line.unit,
                skuSnapshot: line.skuSnapshot || "",
                nameSnapshot: line.nameSnapshot || "",
                categorySnapshot: line.categorySnapshot || null,
                variantSnapshot: line.variantSnapshot || null,
                createdAt: new Date(),
                updatedAt: new Date(),
              })),
            )
            .returning();
          createdLines.push(...inserted);
        }

        await tx.insert(orderStatusHistories).values({
          goodReceiptId: receipt.id,
          status: ORDER_STATUS.DRAFT,
          changedBy: userId,
          changedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return {
          ...receipt,
          goodReceiptLines: createdLines,
        };
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  update: async (id: number, data: any, userId?: number) => {
    try {
      return await db.transaction(async (tx) => {
        const goodReceipt = await tx.query.goodReceipts.findFirst({
          where: (tbl, { eq, and, isNull }) =>
            and(eq(tbl.id, id), isNull(tbl.deletedAt)),
          with: {
            goodReceiptLines: {
              where: (tbl, { isNull }) => isNull(tbl.deletedAt),
            },
          },
        });

        if (!goodReceipt) {
          throw new Error("Good Receipt not found");
        }

        switch (true) {
          case goodReceipt.status === ORDER_STATUS.DRAFT &&
            data.status === ORDER_STATUS.RECEIVED:
            await processReceivedOrder(data, goodReceipt, tx as any, userId);
            break;
          case goodReceipt.status === ORDER_STATUS.DRAFT &&
            (data.status === ORDER_STATUS.DRAFT || !data.status):
            await processUpdateOrder(data, goodReceipt, tx as any);
            break;
          default:
            throw new Error(
              `Invalid status change from ${goodReceipt.status} to ${data.status}`,
            );
        }

        const refreshed = await tx.query.goodReceipts.findFirst({
          where: (tbl, { eq, and, isNull }) =>
            and(eq(tbl.id, id), isNull(tbl.deletedAt)),
          with: {
            supplier: true,
            goodReceiptLines: {
              where: (tbl, { isNull }) => isNull(tbl.deletedAt),
              orderBy: (tbl, { asc }) => asc(tbl.id),
              with: {
                combination: true,
              },
            },
            goodReceiptStatusHistory: {
              orderBy: (tbl, { desc }) => desc(tbl.id),
              with: {
                user: true,
              },
            },
            returnTransactions: {
              where: (tbl, { eq }) => eq(tbl.sourceType, ORDER_TYPE.PURCHASE),
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

        return refreshed ?? goodReceipt;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  delete: async (id: number, userId?: number) => {
    return await db.transaction(async (tx) => {
      const receipt = await tx.query.goodReceipts.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, id), isNull(tbl.deletedAt)),
      });

      if (!receipt) {
        throw new Error(`Good Receipt with ID ${id} not found`);
      }
      if (receipt.status !== ORDER_STATUS.DRAFT) {
        throw new Error("Good Receipt is not in a valid state");
      }

      await tx
        .update(goodReceipts)
        .set({ status: ORDER_STATUS.VOID, updatedAt: new Date() })
        .where(eq(goodReceipts.id, receipt.id));

      await tx.insert(orderStatusHistories).values({
        goodReceiptId: receipt.id,
        status: ORDER_STATUS.VOID,
        changedBy: userId ?? 1,
        changedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        message: `Good Receipt ${id} voided successfully`,
      };
    });
  },

  cancelOrder: async (id: number) => {
    return await db.transaction(async (tx) => {
      const receipt = await tx.query.goodReceipts.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, id), isNull(tbl.deletedAt)),
        with: {
          goodReceiptLines: {
            where: (tbl, { isNull }) => isNull(tbl.deletedAt),
          },
        },
      });

      if (!receipt) {
        throw new Error(`Good Receipt with ID ${id} not found`);
      }

      if (receipt.status === "CANCELLED") {
        return receipt;
      }

      await tx
        .update(goodReceipts)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(goodReceipts.id, receipt.id));

      const lines = receipt.goodReceiptLines || [];
      for (const line of lines) {
        await inventoryServerService.inventoryDecrease(
          {
            combinationId: Number(line.combinationId),
            quantity: Number(line.quantity || 0),
          },
          "OUT",
          receipt.id,
          "CANCELLED_GOOD_RECEIPT",
          tx,
        );
      }

      return receipt;
    });
  },

  supplierReturns: async (
    referenceId: number,
    returns: ReturnExchangeItem[],
    reason: string = "Supplier Return",
  ) => {
    return await db.transaction(async (tx) => {
      const receipt = await tx.query.goodReceipts.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, referenceId), isNull(tbl.deletedAt)),
        with: {
          goodReceiptLines: {
            where: (tbl, { isNull }) => isNull(tbl.deletedAt),
          },
        },
      });

      if (!receipt) {
        throw new Error("Good Receipt not found");
      }
      if (
        receipt.status === ORDER_STATUS.DRAFT ||
        receipt.status === ORDER_STATUS.VOID
      ) {
        throw new Error(
          `Good Receipt is not in a valid state: ${receipt.status}`,
        );
      }

      const activeReturns = returns.filter((i) => Number(i.quantity) > 0);
      if (activeReturns.length === 0) {
        throw new Error("No return items specified");
      }

      const receiptLines = receipt.goodReceiptLines || [];
      let totalReturnAmount = 0;

      // 1. Validate items and enforce cumulative return quantity limits
      for (const ret of activeReturns) {
        const itemLine = receiptLines.find(
          (l: any) => Number(l.combinationId) === Number(ret.combinationId),
        );
        if (!itemLine) {
          throw new Error(
            `Product combination ${ret.combinationId} not found in Good Receipt`,
          );
        }

        const priorReturnTransactions = await tx.query.returnTransactions.findMany({
          where: (tbl, { eq, and }) =>
            and(
              eq(tbl.referenceId, referenceId),
              eq(tbl.sourceType, ORDER_TYPE.PURCHASE),
            ),
          with: {
            returnItems: {
              where: (tbl, { eq }) => eq(tbl.combinationId, Number(ret.combinationId)),
            },
          },
        });

        const totalPriorReturnQuantity = priorReturnTransactions.reduce(
          (acc: number, cur: any) =>
            acc +
            (cur.returnItems || []).reduce(
              (sub: number, ri: any) => sub + Number(ri.quantity || 0),
              0,
            ),
          0,
        );

        if (
          totalPriorReturnQuantity + Number(ret.quantity) >
          Number(itemLine.quantity)
        ) {
          throw new Error("Return quantity exceeds order quantity");
        }

        const discountPerItem = itemLine.discount
          ? Number(itemLine.discount) / Number(itemLine.quantity)
          : 0;
        const unitPrice = Number(itemLine.purchasePrice || 0) - discountPerItem;
        totalReturnAmount += unitPrice * Number(ret.quantity);
      }

      // 2. Create ReturnTransaction
      const [returnTx] = await tx
        .insert(returnTransactions)
        .values({
          sourceType: ORDER_TYPE.PURCHASE,
          referenceId,
          totalReturnAmount: "0",
          totalExchangeAmount: "0",
          paymentDifference: "0",
          type: RETURN_TYPE.SUPPLIER_RETURN_OUT,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // 3. Process each return item & inventory reduction
      for (const ret of activeReturns) {
        const itemLine = receiptLines.find(
          (l: any) => Number(l.combinationId) === Number(ret.combinationId),
        );
        const discountPerItem = itemLine?.discount
          ? Number(itemLine.discount) / Number(itemLine.quantity)
          : 0;
        const unitPrice =
          Number(itemLine?.purchasePrice || 0) - discountPerItem;
        const returnCost = unitPrice * Number(ret.quantity);

        await tx.insert(returnItems).values({
          returnTransactionId: returnTx.id,
          combinationId: Number(ret.combinationId),
          quantity: String(ret.quantity),
          unitPrice: String(unitPrice),
          totalAmount: String(returnCost),
          type: RETURN_TYPE.SUPPLIER_RETURN_OUT,
          reason,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const [inventory] = await tx
          .select()
          .from(inventories)
          .where(eq(inventories.combinationId, Number(ret.combinationId)))
          .for("update");

        if (!inventory) {
          throw new Error(
            `Inventory not found for combination ID ${ret.combinationId}`,
          );
        }

        const remainingQty =
          Number(inventory.quantity || 0) - Number(ret.quantity);
        const averagePrice =
          remainingQty > 0
            ? (Number(inventory.averagePrice || 0) *
              Number(inventory.quantity || 0) -
              returnCost) /
            remainingQty
            : Number(inventory.averagePrice || 0);

        await inventoryServerService.inventoryDecrease(
          {
            combinationId: Number(ret.combinationId),
            quantity: Number(ret.quantity),
            averagePrice,
          },
          INVENTORY_MOVEMENT_TYPE.SUPPLIER_RETURN_OUT,
          receipt.id,
          INVENTORY_MOVEMENT_REFERENCE_TYPE.GOOD_RECEIPT,
          tx,
        );
      }

      const paymentDifference = -totalReturnAmount;
      await tx
        .update(returnTransactions)
        .set({
          totalReturnAmount: String(totalReturnAmount),
          paymentDifference: String(paymentDifference),
          updatedAt: new Date(),
        })
        .where(eq(returnTransactions.id, returnTx.id));

      return {
        success: true,
        returnTransaction: returnTx,
        totalReturnAmount,
        paymentDifference,
        message:
          paymentDifference > 0
            ? "Customer must pay the difference"
            : paymentDifference < 0
              ? "Refund due to customer"
              : "Even exchange completed",
      };
    });
  },

  getGoodReceiptWithReturns: async (goodReceiptId: number) => {
    const gr = await db.query.goodReceipts.findFirst({
      where: (tbl, { eq, and, isNull }) =>
        and(eq(tbl.id, goodReceiptId), isNull(tbl.deletedAt)),
      with: {
        goodReceiptLines: {
          where: (tbl, { isNull }) => isNull(tbl.deletedAt),
        },
      },
    });

    if (!gr) throw new Error("Good Receipt not found");

    const returnTxs = await db.query.returnTransactions.findMany({
      where: (tbl, { eq, and }) =>
        and(
          eq(tbl.referenceId, goodReceiptId),
          eq(tbl.sourceType, "PURCHASE"),
        ),
      with: {
        returnItems: true,
      },
    });

    const allReturnItems = returnTxs.flatMap((rt: any) =>
      (rt.returnItems || []).map((ri: any) => ({
        returnTransactionId: rt.id,
        combinationId: ri.combinationId,
        quantity: Number(ri.quantity || 0),
        reason: ri.reason,
        date: rt.createdAt,
      })),
    );

    const items = (gr.goodReceiptLines || []).map((line: any) => {
      const lineReturns = allReturnItems.filter(
        (ri: any) => Number(ri.combinationId) === Number(line.combinationId),
      );
      const returnedQty = lineReturns.reduce(
        (sum: number, x: any) => sum + x.quantity,
        0,
      );

      return {
        id: line.id,
        combinationId: line.combinationId,
        receivedQty: Number(line.quantity || 0),
        returnedQty,
        netQty: Number(line.quantity || 0) - returnedQty,
        returnHistory: lineReturns.map((r: any) => ({
          qty: r.quantity,
          reason: r.reason,
          date: r.date,
        })),
      };
    });

    return {
      goodReceiptId,
      items,
    };
  },

  getBySupplierId: async (id: number, params: any = {}) => {
    const {
      startDate,
      endDate,
      status,
      sort,
      q,
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
    } = params;

    const conditions = [
      eq(goodReceipts.supplierId, id),
      isNull(goodReceipts.deletedAt),
    ];

    if (q) {
      conditions.push(ilike(goodReceipts.referenceNo, `%${q}%`));
    }
    if (status && status !== "ALL") {
      conditions.push(eq(goodReceipts.status, status));
    }

    const { startBound, endBound } = getDateBounds(startDate, endDate);
    if (startBound) {
      conditions.push(gte(goodReceipts.createdAt, startBound));
    }
    if (endBound) {
      conditions.push(lte(goodReceipts.createdAt, endBound));
    }

    const whereClause = and(...conditions);
    const offset = (page - 1) * limit;

    const [countResult] = await db
      .select({ total: count(goodReceipts.id) })
      .from(goodReceipts)
      .where(whereClause);

    const total = Number(countResult?.total || 0);

    const rows = await db.query.goodReceipts.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (tbl, { asc, desc }) => {
        if (sort) {
          const col = tbl[sort as keyof typeof tbl] || tbl.id;
          return params.order?.toUpperCase() === "ASC" ? asc(col) : desc(col);
        }
        return desc(tbl.id);
      },
      with: {
        supplier: true,
        goodReceiptLines: {
          where: (tbl, { isNull }) => isNull(tbl.deletedAt),
          orderBy: (tbl, { asc }) => asc(tbl.id),
          with: {
            combination: true,
          },
        },
        goodReceiptStatusHistory: {
          orderBy: (tbl, { desc }) => desc(tbl.id),
          with: {
            user: true,
          },
        },
        returnTransactions: {
          where: (tbl, { eq }) => eq(tbl.sourceType, ORDER_TYPE.PURCHASE),
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

    const orderIds = rows.map((r: any) => r.id);
    const returnTxs =
      orderIds.length > 0
        ? await db.query.returnTransactions.findMany({
          where: (tbl, { inArray, eq, and }) =>
            and(
              inArray(tbl.referenceId, orderIds),
              eq(tbl.sourceType, ORDER_TYPE.PURCHASE),
            ),
        })
        : [];

    const enrichedRows = rows.map((row: any) => {
      const rowReturns = returnTxs.filter((rt: any) => rt.referenceId === row.id);
      const totalReturnAmount = rowReturns.reduce(
        (sum: number, rt: any) => sum + Number(rt.totalReturnAmount || 0),
        0,
      );
      const totalExchangeAmount = rowReturns.reduce(
        (sum: number, rt: any) => sum + Number(rt.totalExchangeAmount || 0),
        0,
      );
      return {
        ...row,
        totalReturnAmount,
        totalExchangeAmount,
      };
    });

    const [totalSumResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${goodReceipts.totalAmount}), 0)` })
      .from(goodReceipts)
      .where(whereClause);
    const totalAmount = Number(totalSumResult?.total || 0);

    let totalReturnAmount = 0;
    let totalExchangeAmount = 0;
    if (orderIds.length > 0) {
      const [returnSum] = await db
        .select({
          totalReturn: sql<string>`COALESCE(SUM(${returnTransactions.totalReturnAmount}), 0)`,
          totalExchange: sql<string>`COALESCE(SUM(${returnTransactions.totalExchangeAmount}), 0)`,
        })
        .from(returnTransactions)
        .where(
          and(
            inArray(returnTransactions.referenceId, orderIds),
            eq(returnTransactions.sourceType, ORDER_TYPE.PURCHASE),
          ),
        );
      totalReturnAmount = Number(returnSum?.totalReturn || 0);
      totalExchangeAmount = Number(returnSum?.totalExchange || 0);
    }

    return {
      data: enrichedRows,
      summary: {
        totalAmount,
        totalReturnAmount,
        totalExchangeAmount,
      },
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  },
};
