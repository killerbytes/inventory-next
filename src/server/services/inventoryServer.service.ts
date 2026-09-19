import { truncateQty } from "@/lib/compute";
import sequelize from "@/server/db/sequelize";
import {
  GoodReceipt,
  Inventory,
  InventoryMovement,
  PriceHistory,
  Product,
  ProductCombination,
  ReturnItem,
  ReturnTransaction,
  SalesOrder,
  SalesOrderItem,
  User,
} from "@/server/models";
import { col, fn, Op } from "sequelize";
import "server-only";

export interface GetReordersLevelsInput {
  limit?: number;
  page?: number;
  sort?: "lastSoldAt" | "quantity" | "reorderLevel" | "name" | "transactionCount" | string;
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
    const where = productId ? { productId } : undefined;

    const { count, rows } = await PriceHistory.findAndCountAll({
      limit,
      offset,
      order: [[sort, order]],
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "name", "role"],
        },
        {
          model: ProductCombination,
          as: "combinations",
          where: q ? { name: { [Op.iLike]: `%${q}%` } } : undefined,
          include: [
            {
              model: Product,
              as: "product",
            },
          ],
        },
      ],
    });

    return {
      data: rows,
      meta: {
        total: count,
        totalPages: Math.ceil(count / limit),
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
    const where: any = {};
    if (type && type !== "ALL") {
      where.type = type;
    }

    if (startDate || endDate) {
      where.updatedAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.updatedAt[Op.gte] = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.updatedAt[Op.lte] = end;
      }
    }

    const combinationWhere: any = {};
    if (q) {
      combinationWhere.name = { [Op.iLike]: `%${q}%` };
    } else if (ids && ids.length > 0) {
      combinationWhere.id = { [Op.in]: ids };
    }

    const { count, rows } = await InventoryMovement.findAndCountAll({
      limit,
      offset,
      order: [[sort, order]],
      where: Object.keys(where).length ? where : undefined,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "name", "role"],
        },
        {
          model: SalesOrder,
          as: "salesOrder",
          attributes: ["orderDate"],
          required: false,
        },
        {
          model: GoodReceipt,
          as: "goodReceipt",
          attributes: ["receiptDate"],
          required: false,
        },
        {
          model: ProductCombination,
          as: "combination",
          where: Object.keys(combinationWhere).length
            ? combinationWhere
            : undefined,
          paranoid: false,
          include: [
            {
              model: Product,
              as: "product",
            },
          ],
        },
      ],
    });

    const formattedRows = rows.map((row) => {
      const movement = row.toJSON() as any;
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
      return {
        ...movement,
        referenceDate,
      };
    });

    let totalAmount = 0;
    let totalQuantity = 0;
    try {
      totalAmount =
        (await InventoryMovement.sum("totalCost", {
          where: Object.keys(where).length ? where : undefined,
        })) || 0;
      totalQuantity =
        (await InventoryMovement.sum("quantity", {
          where: Object.keys(where).length ? where : undefined,
        })) || 0;
    } catch (e) {
      // Fallback
    }

    return {
      data: formattedRows,
      meta: {
        total: count,
        totalPages: Math.ceil(count / limit),
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
    transaction: any,
    userId: number = 1,
  ) => {
    const { combinationId } = item;
    const quantity = truncateQty(item.quantity);
    const averagePrice =
      item.averagePrice !== undefined
        ? truncateQty(item.averagePrice)
        : undefined;

    const lock =
      transaction && Object.keys(transaction).length > 0 && transaction.LOCK
        ? { lock: transaction.LOCK.UPDATE }
        : {};

    let inventory = await Inventory.findOne({
      where: { combinationId },
      transaction,
      ...lock,
    });

    if (!inventory) {
      inventory = await Inventory.create(
        {
          combinationId,
          quantity,
          averagePrice: averagePrice ?? 0,
        },
        { transaction },
      );
    } else {
      const newQty = truncateQty(Number(inventory.quantity || 0) + quantity);
      await inventory.update(
        {
          quantity: newQty,
          ...(averagePrice !== undefined && { averagePrice }),
        },
        { transaction },
      );
    }

    const costPerUnit =
      averagePrice !== undefined
        ? averagePrice
        : Number(inventory?.averagePrice || 0);

    await InventoryMovement.create(
      {
        type,
        quantity,
        costPerUnit,
        totalCost: truncateQty(quantity * costPerUnit),
        referenceType,
        referenceId,
        userId,
        combinationId,
      },
      { transaction },
    );

    return inventory;
  },

  inventoryDecrease: async (
    item: { combinationId: number; quantity: number; averagePrice?: number },
    type: string,
    referenceId: number | null = null,
    referenceType: string | null = null,
    transaction: any,
    userId: number = 1,
  ) => {
    const { combinationId } = item;
    const quantity = truncateQty(item.quantity);

    const lock =
      transaction && Object.keys(transaction).length > 0 && transaction.LOCK
        ? { lock: transaction.LOCK.UPDATE }
        : {};

    const inventory = await Inventory.findOne({
      where: { combinationId },
      transaction,
      ...lock,
    });

    if (!inventory) {
      throw new Error(
        `Inventory not found for combination ID ${combinationId}`,
      );
    }

    const currentQty = truncateQty(inventory.quantity || 0);
    const currentPrice = truncateQty(inventory.averagePrice || 0);

    if (currentQty < quantity) {
      throw new Error("Not enough inventory");
    }

    const newQuantity = truncateQty(currentQty - quantity);

    await InventoryMovement.create(
      {
        combinationId,
        quantity: -quantity,
        costPerUnit: currentPrice,
        totalCost: -truncateQty(quantity * currentPrice),
        type,
        userId,
        referenceId,
        referenceType,
      },
      { transaction },
    );

    await inventory.update(
      {
        quantity: newQuantity,
        ...(item.averagePrice !== undefined && {
          averagePrice: truncateQty(item.averagePrice),
        }),
      },
      { transaction },
    );

    return inventory;
  },

  getReturnTransaction: async (referenceId: number | string) => {
    return await ReturnTransaction.findAll({
      where: { referenceId: Number(referenceId) },
    });
  },

  getReturnItems: async (returnTransactionId: number | string) => {
    return await ReturnItem.findAll({
      where: { returnTransactionId: Number(returnTransactionId) },
      include: [
        {
          model: ProductCombination,
          as: "combination",
          include: [{ model: Product, as: "product" }],
        },
      ],
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

    const orderByMap: Record<string, any> = {
      lastSoldAt: fn("MAX", col("combinations->salesOrderItems.updatedAt")),
      quantity: col("Inventory.quantity"),
      reorderLevel: col("combinations.reorderLevel"),
      name: col("combinations.name"),
      transactionCount: fn(
        "COUNT",
        fn("DISTINCT", col("combinations->salesOrderItems.salesOrderId")),
      ),
    };

    const orderBy = orderByMap[sort] || orderByMap.lastSoldAt;

    const { count, rows } = await Inventory.findAndCountAll({
      subQuery: false,
      attributes: [
        "id",
        "quantity",
        "combinationId",
        [
          fn("MAX", col("combinations->salesOrderItems.updatedAt")),
          "lastSoldAt",
        ],
        [
          fn(
            "COUNT",
            fn("DISTINCT", col("combinations->salesOrderItems.salesOrderId")),
          ),
          "transactionCount",
        ],
      ],
      include: [
        {
          model: ProductCombination,
          as: "combinations",
          required: true,
          where: sequelize.literal(
            `"Inventory"."quantity" < "combinations"."reorderLevel"`,
          ),
          include: [
            {
              model: SalesOrderItem,
              as: "salesOrderItems",
              required: true,
              attributes: [],
              include: [
                {
                  model: SalesOrder,
                  as: "salesOrder",
                  required: true,
                  where: { status: "RECEIVED" },
                  attributes: [],
                },
              ],
            },
          ],
        },
      ],
      group: ["Inventory.id", "combinations.id"],
      order: [[orderBy, sortOrder]],
      limit,
      offset,
    });

    const total = Array.isArray(count) ? count.length : count;

    return {
      data: rows,
      meta: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      },
    };
  },
};
