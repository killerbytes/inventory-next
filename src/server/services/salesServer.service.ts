import { getAmount, getTotalAmount } from "@/lib/compute";
import { getMappedVariantValues } from "@/lib/mapped";
import sequelize from "@/server/db/sequelize";
import {
  Category,
  Customer,
  Inventory,
  InventoryMovement,
  OrderStatusHistory,
  Product,
  ProductCombination,
  ReturnItem,
  ReturnTransaction,
  SalesOrder,
  SalesOrderItem,
  User,
  VariantType,
  VariantValue,
} from "@/server/models";
import {
  INVENTORY_MOVEMENT_REFERENCE_TYPE,
  INVENTORY_MOVEMENT_TYPE,
  ORDER_STATUS,
  ORDER_TYPE,
} from "@/types/definitions";
import { Op, QueryTypes } from "sequelize";
import "server-only";
import { handleServiceError } from "./errorHandler";
import { inventoryServerService } from "./inventoryServer.service";

export interface ListSalesOrdersParams {
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  customerId?: string | number | null;
  search?: string | null;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface CreateSalesOrderItemInput {
  id?: number;
  combinationId?: number;
  productId?: number;
  quantity: number;
  purchasePrice?: number;
  originalPrice?: number;
  discount?: number;
  totalAmount?: number;
  unit?: string;
  skuSnapshot?: string;
  nameSnapshot?: string;
  categorySnapshot?: any;
  variantSnapshot?: any;
}

export interface CreateSalesOrderInput {
  customerId: number;
  totalAmount?: number;
  status?: string;
  items?: CreateSalesOrderItemInput[];
  salesOrderItems?: CreateSalesOrderItemInput[];
  modeOfPayment?: string;
}

export interface ProcessReturnInput {
  returnReason?: string;
  restockingFee?: number;
  totalRefundAmount?: number;
}

export interface ReturnExchangeItem {
  combinationId: number;
  quantity: number;
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
      {
        model: Inventory,
        as: "inventory",
      },
    ],
    transaction,
  });
};

const updateOrder = async (
  payload: any,
  salesOrder: any,
  transaction: any,
  updateOrderItems: boolean = false,
) => {
  const items = payload.salesOrderItems || payload.items;
  const updateData: any = {
    ...payload,
  };
  if (items) {
    updateData.totalAmount = getTotalAmount(items);
  }
  delete updateData.salesOrderItems;
  delete updateData.items;

  await salesOrder.update(updateData, { transaction });

  if (updateOrderItems && Array.isArray(items)) {
    const payloadIds = items.filter((i: any) => i.id).map((i: any) => i.id);

    await SalesOrderItem.destroy({
      where: {
        salesOrderId: salesOrder.id,
        id: { [Op.notIn]: payloadIds.length > 0 ? payloadIds : [0] },
      },
      transaction,
    });

    let calculatedTotal = 0;
    for (const item of items) {
      const combinationId = item.combinationId || item.productId;
      const productCombination = await fetchProductCombinationWithDetails(
        combinationId,
        transaction,
      );

      const mappedProps = productCombination
        ? mappedProductCombinationProps(productCombination)
        : {};

      const purchasePrice =
        item.purchasePrice !== undefined
          ? Number(item.purchasePrice)
          : Number(productCombination?.price ?? 0);
      const originalPrice =
        item.originalPrice !== undefined
          ? Number(item.originalPrice)
          : (Number(productCombination?.price) || purchasePrice);
      const quantity = Number(item.quantity || 0);
      const discount = Number(item.discount || 0);
      const totalAmount =
        item.totalAmount !== undefined
          ? Number(item.totalAmount)
          : getAmount({ purchasePrice, quantity, discount });

      calculatedTotal += totalAmount;

      const lineData = {
        ...item,
        combinationId,
        purchasePrice,
        originalPrice,
        quantity,
        discount,
        totalAmount,
        ...mappedProps,
        salesOrderId: salesOrder.id,
      };

      if (item.id) {
        await SalesOrderItem.update(lineData, {
          where: { id: item.id },
          transaction,
        });
      } else {
        await SalesOrderItem.create(lineData, { transaction });
      }
    }

    await salesOrder.update({ totalAmount: calculatedTotal }, { transaction });
  }
};

const processReceivedOrder = async (
  payload: any,
  salesOrder: any,
  transaction: any,
  userId?: number,
  isCreate: boolean = false,
) => {
  const items =
    (isCreate && salesOrder.salesOrderItems?.length)
      ? salesOrder.salesOrderItems
      : (payload.salesOrderItems || payload.items || salesOrder.salesOrderItems || []);

  if (!isCreate) {
    await updateOrder(
      {
        ...payload,
        status: ORDER_STATUS.RECEIVED,
      },
      salesOrder,
      transaction,
      true,
    );
  }

  // Validate available inventory
  for (const item of items) {
    const combinationId = item.combinationId || item.productId;
    const inventory = await Inventory.findOne({
      where: { combinationId },
      transaction,
    });
    const available = Number(inventory?.quantity || 0);
    const requested = Number(item.quantity || 0);
    if (requested > available) {
      throw new Error("Quantity is greater than inventory");
    }
  }

  // Decrease inventory stock
  for (const item of items) {
    const combinationId = item.combinationId || item.productId;
    const quantity = Number(item.quantity || 0);
    await inventoryServerService.inventoryDecrease(
      {
        combinationId,
        quantity,
      },
      INVENTORY_MOVEMENT_TYPE.OUT,
      salesOrder.id,
      INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER,
      transaction,
      userId ?? 1,
    );
  }

  if (!isCreate) {
    await OrderStatusHistory.create(
      {
        salesOrderId: salesOrder.id,
        status: ORDER_STATUS.RECEIVED,
        changedBy: userId ?? 1,
        changedAt: new Date(),
      },
      { transaction },
    );
  }
};

const processCompletedOrder = async (
  payload: any,
  salesOrder: any,
  transaction: any,
  userId?: number,
) => {
  await updateOrder(
    {
      ...payload,
      status: ORDER_STATUS.COMPLETED,
    },
    salesOrder,
    transaction,
    false,
  );

  await OrderStatusHistory.create(
    {
      salesOrderId: salesOrder.id,
      status: ORDER_STATUS.COMPLETED,
      changedBy: userId ?? 1,
      changedAt: new Date(),
    },
    { transaction },
  );
};

export const salesServerService = {
  get: async (id: number) => {
    return await SalesOrder.findByPk(id, {
      include: [
        { model: Customer, as: "customer" },
        {
          model: SalesOrderItem,
          as: "salesOrderItems",
          include: [{ model: ProductCombination, as: "combinations" }],
        },
        {
          model: ReturnTransaction,
          as: "returnTransactions",
          include: [
            {
              model: ReturnItem,
              as: "returnItems",
              include: [{ model: ProductCombination, as: "combination" }],
            },
          ],
        },
      ],
    });
  },

  cancelOrder: async (
    id: number,
    payload?: { reason?: string } | string,
    userId?: number,
  ) => {
    const reason = typeof payload === "string" ? payload : payload?.reason;
    const transaction = await sequelize.transaction();

    try {
      const salesOrder = await SalesOrder.findByPk(id, {
        include: [
          { model: SalesOrderItem, as: "salesOrderItems" },
          { model: ReturnTransaction, as: "returnTransactions" },
        ],
        transaction,
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

      const returnTxs = (salesOrder as any).returnTransactions || [];
      if (returnTxs.length > 0) {
        throw new Error(
          "Cannot cancel order with existing return transactions",
        );
      }

      await salesOrder.update(
        {
          status: ORDER_STATUS.CANCELLED,
          cancellationReason: reason || "Order cancelled by user",
        },
        { transaction },
      );

      const salesMovements = await InventoryMovement.findAll({
        where: {
          referenceId: salesOrder.id,
          referenceType: INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER,
          type: INVENTORY_MOVEMENT_TYPE.OUT,
        },
        transaction,
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
          transaction,
          userId ?? 1,
        );
      }

      await OrderStatusHistory.create(
        {
          salesOrderId: salesOrder.id,
          status: ORDER_STATUS.CANCELLED,
          changedBy: userId ?? 1,
          changedAt: new Date(),
        },
        { transaction },
      );

      await transaction.commit();
      return salesOrder;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  getAll: async (params: ListSalesOrdersParams = {}) => {
    const {
      startDate,
      endDate,
      status,
      customerId,
      search,
      limit = 50,
      offset = 0,
    } = params;
    const where: any = {};

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.orderDate[Op.lte] = new Date(endDate);
      }
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = Number(customerId);
    }

    if (search) {
      where[Op.or] = [
        { salesOrderNumber: { [Op.iLike]: `%${search}%` } },
        { status: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const sort = params.sort || "id";
    const sortOrder = params.order || "DESC";
    const orderByMap: Record<string, any> = {
      "customer.name": [{ model: Customer, as: "customer" }, "name"],
    };
    const orderClause = orderByMap[sort]
      ? [...orderByMap[sort], sortOrder]
      : [[sort, sortOrder]];

    const { rows, count } = await SalesOrder.findAndCountAll({
      where,
      include: [
        { model: Customer, as: "customer" },
        { model: SalesOrderItem, as: "salesOrderItems" },
        {
          model: OrderStatusHistory,
          as: "salesOrderStatusHistory",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "username", "name", "role"],
            },
          ],
        },
        {
          model: ReturnTransaction,
          as: "returnTransactions",
          required: false,
          include: [
            {
              model: ReturnItem,
              as: "returnItems",
            },
          ],
        },
      ],
      order: [orderClause as any],
      limit,
      offset,
      distinct: true,
    });

    return {
      rows: rows as any,
      meta: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Math.floor(offset / limit) + 1,
      },
      summary: await getSummary(where),
    };
  },

  getDailySales: async () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);

    const sales = await SalesOrder.findAll({
      attributes: ["orderDate", "totalAmount"],
      where: {
        status: { [Op.in]: ["RECEIVED", "COMPLETED", "POSTED"] },
        orderDate: { [Op.gte]: startDate },
      },
      raw: true,
    });

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

    sales.forEach((sale: any) => {
      const dateStr = sale.orderDate
        ? new Date(sale.orderDate).toISOString().split("T")[0]
        : "";
      const match = days.find((r) => r.fullDate === dateStr);
      if (match) {
        match.totalAmount += parseFloat(sale.totalAmount || 0);
      }
    });

    return days.map((r) => ({ name: r.name, totalAmount: r.totalAmount }));
  },

  create: async (data: CreateSalesOrderInput, userId?: number) => {
    try {
      return await sequelize.transaction(async (transaction) => {
        const rawItems = data.items || data.salesOrderItems || [];
        const status = data.status || ORDER_STATUS.DRAFT;

        const processedItems = await Promise.all(
          rawItems.map(async (item) => {
            const combinationId = Number(
              item.combinationId || item.productId || 1,
            );
            const productCombination = await fetchProductCombinationWithDetails(
              combinationId,
              transaction,
            );

            if (!productCombination) {
              throw new Error("Product Combination not found");
            }

            const purchasePrice = Number(productCombination.price) || 0;
            const originalPrice = Number(productCombination.price) || 0;

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

        const order = await SalesOrder.create(
          {
            ...data,
            customerId: Number(data.customerId),
            totalAmount,
            status,
            modeOfPayment: data.modeOfPayment || "CASH",
            salesOrderItems: processedItems,
          } as any,
          {
            include: [
              {
                model: SalesOrderItem,
                as: "salesOrderItems",
              },
            ],
            transaction,
          },
        );

        await OrderStatusHistory.create(
          {
            salesOrderId: order.id,
            status,
            changedBy: userId ?? 1,
            changedAt: new Date(),
          },
          { transaction },
        );

        if (status === ORDER_STATUS.RECEIVED) {
          await processReceivedOrder(data, order, transaction, userId, true);
        }

        return order;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  update: async (id: number, data: any, userId?: number) => {
    return await sequelize.transaction(async (transaction) => {
      const salesOrder = await SalesOrder.findByPk(id, {
        include: [
          {
            model: SalesOrderItem,
            as: "salesOrderItems",
          },
        ],
        transaction,
      });
      if (!salesOrder) {
        throw new Error("SalesOrder not found");
      }

      switch (true) {
        case salesOrder.status === ORDER_STATUS.DRAFT &&
          data.status === ORDER_STATUS.RECEIVED:
          await processReceivedOrder(data, salesOrder, transaction, userId);
          break;
        case salesOrder.status === ORDER_STATUS.RECEIVED &&
          data.status === ORDER_STATUS.COMPLETED:
          await processCompletedOrder(data, salesOrder, transaction, userId);
          break;
        case salesOrder.status === ORDER_STATUS.DRAFT &&
          (data.status === ORDER_STATUS.DRAFT || !data.status):
          await updateOrder(data, salesOrder, transaction, true);
          break;
        default:
          throw new Error(
            `Invalid status change from ${salesOrder.status} to ${data.status}`,
          );
      }

      return salesOrder;
    });
  },

  delete: async (id: number) => {
    return await sequelize.transaction(async (transaction) => {
      const order = await SalesOrder.findByPk(id, { transaction });
      if (!order) {
        throw new Error(`Sales Order with ID ${id} not found`);
      }
      await SalesOrderItem.destroy({
        where: { salesOrderId: id },
        transaction,
      });
      await order.destroy({ transaction });
      return {
        success: true,
        message: `Sales Order ${id} deleted successfully`,
      };
    });
  },

  returnExchange: async (
    referenceId: number,
    returns: ReturnExchangeItem[] = [],
    exchanges: ReturnExchangeItem[] = [],
    reason: string = "Customer Return",
    // TODO: Why no user logged?
  ) => {
    return await sequelize.transaction(async (transaction) => {
      const salesOrder = await SalesOrder.findByPk(referenceId, {
        include: [{ model: SalesOrderItem, as: "salesOrderItems" }],
        transaction,
      });

      if (!salesOrder) {
        throw new Error("Sales order not found");
      }

      if (
        salesOrder.status !== "COMPLETED" &&
        salesOrder.status !== "RECEIVED"
      ) {
        throw new Error("SalesOrder is not in a valid state");
      }

      let totalReturnAmount = 0;
      let totalExchangeAmount = 0;

      // Create ReturnTransaction
      const returnTx = await ReturnTransaction.create(
        {
          sourceType: "SALES",
          referenceId,
          totalReturnAmount: 0,
          totalExchangeAmount: 0,
          paymentDifference: 0,
          type: exchanges.length > 0 ? "EXCHANGE" : "RETURN",
        },
        { transaction },
      );

      // Process Returns
      for (const ret of returns) {
        const orderItem = (salesOrder as any).salesOrderItems?.find(
          (item: any) =>
            Number(item.combinationId) === Number(ret.combinationId),
        );
        const itemPrice = orderItem ? Number(orderItem.purchasePrice || 0) : 0;
        const returnVal = itemPrice * ret.quantity;
        totalReturnAmount += returnVal;

        await ReturnItem.create(
          {
            returnTransactionId: returnTx.id,
            combinationId: ret.combinationId,
            quantity: ret.quantity,
            unitPrice: itemPrice,
            totalAmount: returnVal,
            type: "RETURN",
            reason,
          },
          { transaction },
        );

        await inventoryServerService.inventoryIncrease(
          {
            combinationId: ret.combinationId,
            quantity: ret.quantity,
          },
          "RETURN_IN",
          returnTx.id,
          "RETURN_TRANSACTION",
          transaction,
        );
      }

      // Process Exchanges
      for (const ex of exchanges) {
        const replaceCombo = await ProductCombination.findByPk(
          ex.combinationId,
          {
            include: [{ model: Inventory, as: "inventory" }],
            transaction,
          },
        );

        if (!replaceCombo) {
          throw new Error(`Replacement item ${ex.combinationId} not found`);
        }

        const price = Number(replaceCombo.price || 0);
        totalExchangeAmount += price * ex.quantity;

        await ReturnItem.create(
          {
            returnTransactionId: returnTx.id,
            combinationId: ex.combinationId,
            quantity: ex.quantity,
            unitPrice: price,
            totalAmount: price * ex.quantity,
            type: "EXCHANGE",
            reason: `Exchange for returned goods: ${reason}`,
          },
          { transaction },
        );

        await inventoryServerService.inventoryDecrease(
          {
            combinationId: ex.combinationId,
            quantity: ex.quantity,
          },
          "EXCHANGE_OUT",
          returnTx.id,
          "RETURN_TRANSACTION",
          transaction,
        );
      }

      const paymentDifference = totalExchangeAmount - totalReturnAmount;

      await returnTx.update(
        {
          totalReturnAmount,
          totalExchangeAmount,
          paymentDifference,
        },
        { transaction },
      );

      return {
        returnTransaction: returnTx,
        totalReturnAmount,
        totalExchangeAmount,
        paymentDifference,
      };
    });
  },

  processReturn: async (salesOrderId: number, payload: ProcessReturnInput) => {
    //TODO: No user logged?
    return await sequelize.transaction(async (transaction) => {
      const returnTx = await ReturnTransaction.create(
        {
          sourceType: "SALES",
          referenceId: Number(salesOrderId),
          totalReturnAmount: Number(payload.totalRefundAmount) || 0,
          totalExchangeAmount: 0,
          paymentDifference: Number(payload.totalRefundAmount) || 0,
          type: "RETURN",
        },
        { transaction },
      );

      await SalesOrder.update(
        { status: "RETURNED" },
        { where: { id: Number(salesOrderId) }, transaction },
      );

      return returnTx;
    });
  },
};

const getSummary = async (where: any) => {
  const totalAmount = await SalesOrder.sum("totalAmount", {
    where: {
      ...where,
      ...{
        status: { [Op.in]: [ORDER_STATUS.RECEIVED, ORDER_STATUS.COMPLETED] },
      },
    },
  });

  const orderIds = await SalesOrder.findAll({
    attributes: ["id"],
    where: Object.keys(where).length ? where : undefined,
    raw: true,
  }).then((r) => r.map((o) => o.id));

  let returnsWhere = {
    referenceId: { [Op.in]: orderIds },
    sourceType: ORDER_TYPE.SALE,
  };

  const totalReturnAmount = await ReturnTransaction.sum("totalReturnAmount", {
    where: returnsWhere,
  });

  const totalExchangeAmount = await ReturnTransaction.sum(
    "totalExchangeAmount",
    { where: returnsWhere },
  );

  const startDate = where?.orderDate?.[Op.gte] ?? null;
  const endDate = where?.orderDate?.[Op.lte] ?? null;

  const [{ totalCost = 0 }]: any = await sequelize.query(
    `
SELECT
  SUM(im."totalCost") AS "totalCost"
FROM "InventoryMovements" im
JOIN "SalesOrders" so
  ON so."id" = im."referenceId"
WHERE
  im."referenceType" = 'SALES_ORDER'
AND so."status" IN ('RECEIVED', 'COMPLETED')
AND (:startDate IS NULL OR so."orderDate" >= :startDate)
AND (:endDate IS NULL OR so."orderDate" <= :endDate)
`,
    {
      replacements: {
        startDate,
        endDate,
      },
      type: QueryTypes.SELECT,
    },
  );

  return {
    totalAmount: {
      label: "Total Amount",
      value:
        totalAmount - (totalReturnAmount || 0) + (totalExchangeAmount || 0),
    },
    totalProfitAmount: {
      label: "Calculated Profit",
      value:
        Number(
          totalAmount - (totalReturnAmount || 0) + (totalExchangeAmount || 0),
        ) + Number(totalCost || 0),
    },
    totalReturnAmount: {
      label: "Total Returns",
      value: totalReturnAmount,
    },
    totalExchangeAmount: {
      label: "Total Exchange",
      value: totalExchangeAmount,
    },
  };
};
