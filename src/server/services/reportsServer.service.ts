import sequelize from "@/server/db/sequelize";
import {
  BreakPack,
  Inventory,
  InventoryMovement,
  PriceHistory,
  Product,
  ProductCombination,
  SalesOrder,
  SalesOrderItem,
  StockAdjustment,
  User,
} from "@/server/models";
import { PAGINATION } from "@/types/definitions";
import { Op } from "sequelize";
import "server-only";
import {
  GetReordersLevelsInput,
  inventoryServerService,
} from "./inventoryServer.service";

export const reportsServerService = {
  getPriceHistory: async () => {
    return await PriceHistory.findAll({
      include: [
        {
          model: ProductCombination,
          as: "combination",
          include: [{ model: Product, as: "product" }],
        },
        { model: User, as: "user" },
      ],
      order: [["id", "DESC"]],
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

    const queryOptions: any = {
      include: [
        {
          model: ProductCombination,
          as: "fromCombination",
          include: [{ model: Product, as: "product" }],
        },
        {
          model: ProductCombination,
          as: "toCombination",
          include: [{ model: Product, as: "product" }],
        },
        { model: User, as: "user" },
      ],
      order: [["id", "DESC"]],
    };

    if (limit !== undefined) {
      queryOptions.limit = limit;
      queryOptions.offset = offset || 0;
      queryOptions.distinct = true;
      const { count, rows } = await BreakPack.findAndCountAll(queryOptions);
      return {
        rows,
        meta: {
          total: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page || 1,
        },
      };
    }

    return await BreakPack.findAll(queryOptions);
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

    const salesOrderWhere: any = {
      status: "RECEIVED",
    };
    if (startDate && endDate) {
      salesOrderWhere.orderDate = { [Op.between]: [startDate, endDate] };
    }

    const orderByMap: Record<string, any> = {
      name: [{ model: ProductCombination, as: "combinations" }, "name"],
      transactionCount: [sequelize.literal('"transactionCount"'), order],
    };

    const orderBy = orderByMap[sort] || [
      sequelize.literal('"transactionCount"'),
      order,
    ];

    const rows = await SalesOrderItem.findAll({
      attributes: [
        "combinationId",
        [
          sequelize.fn(
            "COUNT",
            sequelize.fn("DISTINCT", sequelize.col("salesOrder.id")),
          ),
          "transactionCount",
        ],
      ],
      include: [
        {
          model: SalesOrder,
          as: "salesOrder",
          attributes: [],
          where: salesOrderWhere,
        },
        {
          model: ProductCombination,
          as: "combination",
        },
      ],
      group: ["combinationId", "combination.id"],
      order: [orderBy],
      limit,
      offset,
    });

    const count = await SalesOrderItem.count({
      distinct: true,
      col: "combinationId",
      include: [
        {
          model: SalesOrder,
          as: "salesOrder",
          where: salesOrderWhere,
        },
      ],
    });

    return {
      data: rows.map(i => i.get({ plain: true })),
      meta: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
      },
    };
  },

  getProfitProducts: async (params: any = {}) => {
    const { limit = 50, page = 1 } = params;
    const offset = (page - 1) * limit;

    const rows = await SalesOrderItem.findAll({
      attributes: [
        "combinationId",
        "nameSnapshot",
        "unit",
        [
          sequelize.literal(`SUM("SalesOrderItem"."quantity")`),
          "totalQuantity",
        ],
        [
          sequelize.literal(
            `SUM(("SalesOrderItem"."purchasePrice" - COALESCE("combinations->inventory"."averagePrice", 0)) * "SalesOrderItem"."quantity")`,
          ),
          "totalProfit",
        ],
      ],
      include: [
        {
          model: SalesOrder,
          as: "salesOrder",
        },
        {
          model: ProductCombination,
          as: "combinations",
          include: [
            {
              model: Inventory,
              as: "inventory",
              attributes: ["averagePrice"],
            },
          ],
        },
      ],
      group: [
        "SalesOrderItem.nameSnapshot",
        "SalesOrderItem.unit",
        "salesOrder.id",
        "SalesOrderItem.combinationId",
        "combinations.id",
        "combinations->inventory.id",
      ],
      limit,
      offset,
    });

    const count = await SalesOrderItem.count({
      distinct: true,
      col: "combinationId",
    });

    return {
      data: rows,
      meta: {
        total: count,
        totalPages: Math.ceil(count / limit),
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
      status,
    } = params;
    const offset = (page - 1) * limit;

    const where: any = { "$salesOrderItems.id$": null };

    if (q) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { sku: { [Op.iLike]: `%${q}%` } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [startDate, endDate] };
    }

    const orderByMap: Record<string, any> = {
      quantity: [sequelize.literal('"inventory.quantity"'), order],
    };

    const orderBy = orderByMap[sort] || [sort, order];

    const { rows, count } = await ProductCombination.findAndCountAll({
      include: [
        {
          model: Inventory,
          as: "inventory",
          where: {
            quantity: { [Op.gt]: 0 },
          },
        },
        {
          model: SalesOrderItem,
          as: "salesOrderItems",
          required: false,
          attributes: [],
          include: [
            {
              model: SalesOrder,
              as: "salesOrder",
              required: true,
              attributes: [],
              where: {
                status: "RECEIVED",
              },
            },
          ],
        },
      ],
      where,
      order: [orderBy],
      limit,
      offset,
      distinct: true,
      subQuery: false,
    });

    return {
      data: rows.map(i => (i.get ? i.get({ plain: true }) : i)),
      meta: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: Number(page),
      },
    };
  },

  getInventoryValue: async () => {
    const result: any = await Inventory.unscoped().findOne({
      attributes: [
        [sequelize.literal('SUM("quantity" * "averagePrice")'), "totalValue"],
      ],
      raw: true,
      order: [],
    });

    return {
      totalValue: parseFloat(result?.totalValue) || 0,
    };
  },

  getInventoryValueFromMovements: async () => {
    const result: any = await InventoryMovement.unscoped().findOne({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("totalCost")), "totalValue"],
      ],
      raw: true,
      order: [],
    });

    return {
      totalValue: parseFloat(result?.totalValue) || 0,
    };
  },

  /**
   * Retrieves products and combinations below their reorder level threshold that have sales history.
   * Aligns with inventory-api `inventoryService.getReordersLevels`.
   *
   * @param params Pagination and sorting parameters (limit, page, sort, order)
   * @returns Paginated list of low-stock inventory records with combination details and transaction stats
   */
  getReorderLevels: async (params: GetReordersLevelsInput = {}) => {
    return await inventoryServerService.getReordersLevels(params);
  },

  /**
   * Retrieves product combinations with inventory stock (> 0) that have no sales history in completed (RECEIVED) sales orders.
   * Aligns with inventory-api `reportsService.noSaleProducts`.
   *
   * @param params Pagination, filtering, and sorting parameters (limit, page, sort, order, q, startDate, endDate)
   * @returns Paginated list of no-sale product combinations with inventory details
   */
  getNoSales: async (params: any = {}) => {
    return await reportsServerService.noSaleProducts(params);
  },

  getProfitSummary: async () => {
    const orders = await SalesOrder.findAll({
      include: [{ model: SalesOrderItem, as: "salesOrderItems" }],
    });
    const totalSales = orders.reduce(
      (acc, o) => acc + Number(o.totalAmount || 0),
      0,
    );
    let totalCost = 0;
    for (const order of orders) {
      const items = (order as any).salesOrderItems || [];
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
    return await StockAdjustment.findAll({
      include: [
        {
          model: ProductCombination,
          as: "combination",
          include: [{ model: Product, as: "product" }],
        },
        { model: User, as: "user" },
      ],
      order: [["id", "DESC"]],
    });
  },
};
