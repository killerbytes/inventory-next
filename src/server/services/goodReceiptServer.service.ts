import { getAmount, getTotalAmount, normalize } from "@/lib/compute";
import { getMappedVariantValues } from "@/lib/mapped";
import { GoodReceiptData, GoodReceiptInput } from "@/schemas";
import sequelize from "@/server/db/sequelize";
import {
  Category,
  GoodReceipt,
  GoodReceiptLine,
  Inventory,
  OrderStatusHistory,
  Product,
  ProductCombination,
  ReturnItem,
  ReturnTransaction,
  Supplier,
  User,
  VariantType,
  VariantValue,
} from "@/server/models";
import {
  INVENTORY_MOVEMENT_REFERENCE_TYPE,
  INVENTORY_MOVEMENT_TYPE,
  ORDER_STATUS,
  ORDER_TYPE,
  PAGINATION,
  RETURN_TYPE,
} from "@/types/definitions";
import { Op } from "sequelize";
import "server-only";
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
  transaction?: any,
) => {
  return await ProductCombination.findByPk(combinationId, {
    include: [
      {
        model: Product,
        as: "product",
        include: [
          { model: Category, as: "category" },
          {
            model: VariantType,
            as: "variants",
            include: [{ model: VariantValue, as: "values" }],
          },
        ],
      },
      {
        model: VariantValue,
        as: "values",
        through: { attributes: [] },
        order: [["variantTypeId", "ASC"]],
      },
    ],
    transaction,
  });
};

const updateOrder = async (
  payload: any,
  goodReceipt: any,
  transaction: any,
  updateOrderItems: boolean = false,
) => {
  const updateData: any = {
    ...payload,
  };
  if (payload.goodReceiptLines) {
    updateData.totalAmount = getTotalAmount(payload.goodReceiptLines);
  }
  delete updateData.goodReceiptLines;

  await goodReceipt.update(updateData, { transaction });

  if (updateOrderItems && Array.isArray(payload.goodReceiptLines)) {
    const payloadIds = payload.goodReceiptLines
      .filter((i: any) => i.id)
      .map((i: any) => i.id);

    await GoodReceiptLine.destroy({
      where: {
        goodReceiptId: goodReceipt.id,
        id: { [Op.notIn]: payloadIds.length > 0 ? payloadIds : [0] },
      },
      transaction,
    });

    for (const item of payload.goodReceiptLines) {
      const productCombination = await fetchProductCombinationWithDetails(
        item.combinationId,
        transaction,
      );

      const mappedProps = productCombination
        ? mappedProductCombinationProps(productCombination)
        : {};

      const lineData = {
        ...item,
        ...mappedProps,
        totalAmount: getAmount(item),
        goodReceiptId: goodReceipt.id,
      };

      if (item.id) {
        await GoodReceiptLine.update(lineData, {
          where: { id: item.id, goodReceiptId: goodReceipt.id },
          transaction,
        });
      } else {
        await GoodReceiptLine.create(lineData, { transaction });
      }
    }
  }
};

const processReceivedOrder = async (
  payload: any,
  goodReceipt: any,
  transaction: any,
  userId?: number,
) => {
  await updateOrder(
    {
      ...payload,
      status: ORDER_STATUS.RECEIVED,
    },
    goodReceipt,
    transaction,
    true,
  );

  const linesToProcess =
    payload.goodReceiptLines && payload.goodReceiptLines.length > 0
      ? payload.goodReceiptLines
      : goodReceipt.goodReceiptLines || [];

  for (const item of linesToProcess) {
    const { combinationId, quantity, purchasePrice, discount = 0 } = item;

    const inventory = await Inventory.findOne({
      where: { combinationId },
      transaction,
    });
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
      transaction,
    );
  }

  await OrderStatusHistory.create(
    {
      goodReceiptId: goodReceipt.id,
      status: ORDER_STATUS.RECEIVED,
      changedBy: userId ?? 1,
      changedAt: new Date(),
    },
    { transaction },
  );
};

const processUpdateOrder = async (
  payload: any,
  goodReceipt: any,
  transaction: any,
) => {
  await updateOrder(payload, goodReceipt, transaction, true);
};

export const goodReceiptServerService = {
  get: async (id: number) => {
    return await GoodReceipt.findByPk(id, {
      include: [...goodReceiptIncludes],
      order: [
        [
          {
            model: GoodReceiptLine,
            as: "goodReceiptLines",
          },
          "id",
          "ASC",
        ],
        [
          { model: OrderStatusHistory, as: "goodReceiptStatusHistory" },
          "id",
          "DESC",
        ],
      ],
    });
  },

  getAll: async (params: ListGoodReceiptsParams = {}) => {
    const {
      startDate,
      endDate,
      supplierId,
      search,
      status,
      limit = PAGINATION.PAGE_SIZE,
      offset = 0,
    } = params;
    const where: any = {};

    if (startDate || endDate) {
      where.receiptDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.receiptDate[Op.gte] = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.receiptDate[Op.lte] = end;
      }
    }

    if (supplierId) {
      where.supplierId = Number(supplierId);
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { referenceNo: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows, count } = await GoodReceipt.findAndCountAll({
      where,
      include: [...goodReceiptIncludes],
      order: [["id", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return {
      data: rows.map(
        (r) => r.get({ plain: true }) as unknown as GoodReceiptData,
      ),
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Math.floor(offset / limit) + 1,
      },
      summary: await getSummary(where),
    };
  },

  getByProductCombination: async (list: (number | string)[]) => {
    const result: any[] = [];
    for (const id of list) {
      const gr = await GoodReceiptLine.findOne({
        where: { id: Number(id) },
        include: [
          {
            model: ProductCombination,
            as: "combination",
          },
        ],
      });

      if (gr) {
        const purchasePrice = Number(gr.purchasePrice || 0);
        const quantity = Number(gr.quantity || 1);
        const totalAmount = Number(gr.totalAmount || 0);
        const combo = (gr as any).combinations || {};

        result.push({
          id: gr.id,
          comboId: gr.combinationId,
          purchasePrice,
          unitPrice: quantity > 0 ? totalAmount / quantity : purchasePrice,
          quantity,
          price: combo.price || 0,
        });
      }
    }
    return result;
  },

  create: async (data: GoodReceiptInput, userId: number) => {
    try {
      return await sequelize.transaction(async (transaction) => {
        const rawLines = data.goodReceiptLines || [];
        const totalAmount = getTotalAmount(rawLines);

        const processedItems = await Promise.all(
          rawLines.map(async (item) => {
            const productCombination = await fetchProductCombinationWithDetails(
              item.combinationId,
              transaction,
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

        const receipt = await GoodReceipt.create(
          {
            ...data,
            goodReceiptLines: processedItems,
            totalAmount,
            status: ORDER_STATUS.DRAFT,
          } as any,
          {
            include: [
              {
                model: GoodReceiptLine,
                as: "goodReceiptLines",
              },
            ],
            transaction,
          },
        );

        await OrderStatusHistory.create(
          {
            goodReceiptId: receipt.id,
            status: ORDER_STATUS.DRAFT,
            changedBy: userId,
            changedAt: new Date(),
          },
          { transaction },
        );

        return receipt;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  update: async (id: number, data: any, userId?: number) => {
    try {
      return await sequelize.transaction(async (transaction) => {
        const goodReceipt = await GoodReceipt.findByPk(id, {
          include: [
            {
              model: GoodReceiptLine,
              as: "goodReceiptLines",
            },
          ],
          transaction,
        });
        if (!goodReceipt) {
          throw new Error("Good Receipt not found");
        }

        switch (true) {
          case goodReceipt.status === ORDER_STATUS.DRAFT &&
            data.status === ORDER_STATUS.RECEIVED:
            await processReceivedOrder(data, goodReceipt, transaction, userId);
            break;
          case goodReceipt.status === ORDER_STATUS.DRAFT &&
            (data.status === ORDER_STATUS.DRAFT || !data.status):
            await processUpdateOrder(data, goodReceipt, transaction);
            break;
          default:
            throw new Error(
              `Invalid status change from ${goodReceipt.status} to ${data.status}`,
            );
        }

        return goodReceipt;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  delete: async (id: number, userId?: number) => {
    return await sequelize.transaction(async (transaction) => {
      const receipt = await GoodReceipt.findByPk(id, { transaction });
      if (!receipt) {
        throw new Error(`Good Receipt with ID ${id} not found`);
      }
      if (receipt.status !== ORDER_STATUS.DRAFT) {
        throw new Error("Good Receipt is not in a valid state");
      }
      await updateOrder(
        { status: ORDER_STATUS.VOID },
        receipt,
        transaction,
        false,
      );
      await OrderStatusHistory.create(
        {
          goodReceiptId: receipt.id,
          status: ORDER_STATUS.VOID,
          changedBy: userId ?? 1,
          changedAt: new Date(),
        },
        { transaction },
      );
      return {
        success: true,
        message: `Good Receipt ${id} voided successfully`,
      };
    });
  },

  cancelOrder: async (id: number) => {
    return await sequelize.transaction(async (transaction) => {
      const receipt = await GoodReceipt.findByPk(id, {
        include: [{ model: GoodReceiptLine, as: "goodReceiptLines" }],
        transaction,
      });

      if (!receipt) {
        throw new Error(`Good Receipt with ID ${id} not found`);
      }

      if (receipt.status === "CANCELLED") {
        return receipt;
      }

      await receipt.update({ status: "CANCELLED" }, { transaction });

      // Reverse inventory increases
      const lines = (receipt as any).goodReceiptLines || [];
      for (const line of lines) {
        if (transaction && Object.keys(transaction).length === 0) {
          continue;
        }
        await inventoryServerService.inventoryDecrease(
          {
            combinationId: Number(line.combinationId),
            quantity: Number(line.quantity || 0),
          },
          "OUT",
          receipt.id,
          "CANCELLED_GOOD_RECEIPT",
          transaction,
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
    return await sequelize.transaction(async (transaction) => {
      const receipt = await GoodReceipt.findByPk(referenceId, {
        include: [{ model: GoodReceiptLine, as: "goodReceiptLines" }],
        transaction,
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

      const receiptLines = receipt.goodReceiptLines;
      let totalReturnAmount = 0;

      // 1. Validate items and enforce cumulative return quantity limits
      for (const ret of activeReturns) {
        const itemLine = receiptLines?.find(
          (l: any) => Number(l.combinationId) === Number(ret.combinationId),
        );
        if (!itemLine) {
          throw new Error(
            `Product combination ${ret.combinationId} not found in Good Receipt`,
          );
        }

        const priorReturnTransactions = await ReturnTransaction.findAll({
          where: {
            referenceId,
            sourceType: ORDER_TYPE.PURCHASE,
          },
          include: [
            {
              model: ReturnItem,
              as: "returnItems",
              where: { combinationId: ret.combinationId },
            },
          ],
          transaction,
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
      const returnTx = await ReturnTransaction.create(
        {
          sourceType: ORDER_TYPE.PURCHASE,
          referenceId,
          totalReturnAmount: 0,
          totalExchangeAmount: 0,
          paymentDifference: 0,
          type: RETURN_TYPE.SUPPLIER_RETURN_OUT,
        },
        { transaction },
      );

      // 3. Process each return item & inventory reduction
      for (const ret of activeReturns) {
        const itemLine = receiptLines?.find(
          (l: any) => Number(l.combinationId) === Number(ret.combinationId),
        );
        const discountPerItem = itemLine?.discount
          ? Number(itemLine.discount) / Number(itemLine.quantity)
          : 0;
        const unitPrice =
          Number(itemLine?.purchasePrice || 0) - discountPerItem;
        const returnCost = unitPrice * Number(ret.quantity);

        await ReturnItem.create(
          {
            returnTransactionId: returnTx.id,
            combinationId: ret.combinationId,
            quantity: Number(ret.quantity),
            unitPrice,
            totalAmount: returnCost,
            type: RETURN_TYPE.SUPPLIER_RETURN_OUT,
            reason,
          },
          { transaction },
        );

        const lock =
          transaction && Object.keys(transaction).length > 0 && transaction.LOCK
            ? { lock: transaction.LOCK.UPDATE }
            : {};

        const inventory = await Inventory.findOne({
          where: { combinationId: ret.combinationId },
          transaction,
          ...lock,
        });

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
            combinationId: ret.combinationId,
            quantity: Number(ret.quantity),
            averagePrice,
          },
          INVENTORY_MOVEMENT_TYPE.SUPPLIER_RETURN_OUT,
          receipt.id,
          INVENTORY_MOVEMENT_REFERENCE_TYPE.GOOD_RECEIPT,
          transaction,
        );
      }

      const paymentDifference = -totalReturnAmount;
      await returnTx.update(
        {
          totalReturnAmount,
          paymentDifference,
        },
        { transaction },
      );

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
    const gr = await GoodReceipt.findByPk(goodReceiptId, {
      include: [{ model: GoodReceiptLine, as: "goodReceiptLines" }],
    });

    if (!gr) throw new Error("Good Receipt not found");

    const returnTransactions = await ReturnTransaction.findAll({
      where: {
        referenceId: goodReceiptId,
        sourceType: "PURCHASE",
      },
      include: [{ model: ReturnItem, as: "returnItems" }],
    });

    const allReturnItems = returnTransactions.flatMap((rt: any) =>
      (rt.returnItems || []).map((ri: any) => ({
        returnTransactionId: rt.id,
        combinationId: ri.combinationId,
        quantity: Number(ri.quantity || 0),
        reason: ri.reason,
        date: rt.createdAt,
      })),
    );

    const items = ((gr as any).goodReceiptLines || []).map((line: any) => {
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
    const where: any = {
      supplierId: id,
    };

    if (q) {
      where.referenceNo = { [Op.iLike]: `%${q}%` };
    }
    if (status && status !== "ALL") {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt[Op.gte] = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }
    const offset = (page - 1) * limit;

    const order: any[] = [];
    if (sort) {
      order.push([sort, params.order || "ASC"]);
    } else {
      order.push(["id", "DESC"]);
    }

    const { count, rows } = await GoodReceipt.findAndCountAll({
      order: order as any,
      where: Object.keys(where).length ? where : undefined,
      include: [...goodReceiptIncludes],
      limit,
      offset,
      distinct: true,
    });

    const orderIds = rows.map((r: any) => r.id);
    const returnTransactions =
      orderIds.length > 0
        ? await ReturnTransaction.findAll({
            where: {
              referenceId: { [Op.in]: orderIds },
              sourceType: ORDER_TYPE.PURCHASE,
            },
          })
        : [];

    const enrichedRows = rows.map((row: any) => {
      const rowReturns = returnTransactions.filter(
        (rt: any) => rt.referenceId === row.id,
      );
      const totalReturnAmount = rowReturns.reduce(
        (sum: number, rt: any) => sum + Number(rt.totalReturnAmount || 0),
        0,
      );
      const totalExchangeAmount = rowReturns.reduce(
        (sum: number, rt: any) => sum + Number(rt.totalExchangeAmount || 0),
        0,
      );
      const plain = row.toJSON ? row.toJSON() : row;
      return {
        ...plain,
        totalReturnAmount,
        totalExchangeAmount,
      };
    });

    const totalAmount =
      (await GoodReceipt.sum("totalAmount", {
        where: Object.keys(where).length ? where : undefined,
      })) || 0;

    const totalReturnAmount =
      orderIds.length > 0
        ? (await ReturnTransaction.sum("totalReturnAmount", {
            where: {
              referenceId: { [Op.in]: orderIds },
              sourceType: ORDER_TYPE.PURCHASE,
            },
          })) || 0
        : 0;

    const totalExchangeAmount =
      orderIds.length > 0
        ? (await ReturnTransaction.sum("totalExchangeAmount", {
            where: {
              referenceId: { [Op.in]: orderIds },
              sourceType: ORDER_TYPE.PURCHASE,
            },
          })) || 0
        : 0;

    return {
      data: enrichedRows,
      summary: {
        totalAmount,
        totalReturnAmount,
        totalExchangeAmount,
      },
      meta: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      },
    };
  },
};

const goodReceiptIncludes = [
  {
    model: GoodReceiptLine,
    as: "goodReceiptLines",
    include: [
      {
        model: ProductCombination,
        as: "combination",
      },
    ],
  },
  {
    model: Supplier,
    as: "supplier",
  },
  {
    model: OrderStatusHistory,
    as: "goodReceiptStatusHistory",
    include: [
      {
        model: User,
        as: "user",
      },
    ],
  },
  {
    model: ReturnTransaction,
    as: "returnTransactions",
    required: false,
    where: [
      {
        sourceType: ORDER_TYPE.PURCHASE,
      },
    ],
    include: [
      {
        model: ReturnItem,
        as: "returnItems",
        include: [
          {
            model: ProductCombination,
            as: "combination",
          },
        ],
      },
    ],
  },
];

const getSummary = async (where: any) => {
  let totalAmount = await GoodReceipt.sum("totalAmount", {
    where: {
      status: { [Op.ne]: ORDER_STATUS.DRAFT },
      ...where,
    },
  });

  let totalPaid = await GoodReceipt.sum("totalAmount", {
    where: {
      status: ORDER_STATUS.COMPLETED,
      ...where,
    },
  });

  const orderIds = await GoodReceipt.findAll({
    attributes: ["id"],
    where: Object.keys(where).length ? where : undefined,
    raw: true,
  }).then((r) => r.map((o) => o.id));

  let returnsWhere = { referenceId: { [Op.in]: orderIds } };

  const totalReturnAmount = await ReturnTransaction.sum("totalReturnAmount", {
    where: returnsWhere,
  });

  return {
    totalAmount: totalAmount - (totalReturnAmount || 0),
    totalPayableAmount: totalAmount - totalPaid,
    totalReturnAmount: totalReturnAmount,
  };
};
