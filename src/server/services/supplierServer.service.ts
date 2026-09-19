import {
  GoodReceipt,
  GoodReceiptLine,
  ProductCombination,
  Supplier,
  VariantValue,
} from "@/server/models";
import { Op } from "sequelize";
import "server-only";

export interface GetSupplierPaginatedInput {
  limit?: number;
  page?: number;
  q?: string | null;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface CreateSupplierInput {
  name: string;
  code?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  code?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export const supplierServerService = {
  get: async (id: number) => {
    return await Supplier.findByPk(id);
  },

  getAll: async () => {
    return await Supplier.findAll({
      order: [["name", "ASC"]],
    });
  },

  getPaginated: async (params: GetSupplierPaginatedInput = {}) => {
    const {
      limit = 50,
      page = 1,
      q = null,
      sort = "name",
      order = "ASC",
    } = params;

    const offset = (page - 1) * limit;

    const where = q
      ? {
          [Op.or]: [
            { address: { [Op.iLike]: `%${q}%` } },
            { contact: { [Op.iLike]: `%${q}%` } },
            { email: { [Op.iLike]: `%${q}%` } },
            { name: { [Op.iLike]: `%${q}%` } },
            { phone: { [Op.iLike]: `%${q}%` } },
            { notes: { [Op.iLike]: `%${q}%` } },
          ],
        }
      : undefined;

    const { count, rows } = await Supplier.findAndCountAll({
      limit,
      offset,
      order: [[sort, order]],
      where,
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

  getByProductId: async (productId: number | string) => {
    return await GoodReceiptLine.findAll({
      attributes: [
        "id",
        "quantity",
        "purchasePrice",
        "totalAmount",
        "unit",
        "nameSnapshot",
      ],
      include: [
        {
          model: GoodReceipt,
          as: "goodReceipt",
          attributes: [
            "id",
            "status",
            "totalAmount",
            "referenceNo",
            "receiptDate",
            "supplierId",
          ],
          include: [
            {
              model: Supplier,
              as: "supplier",
            },
          ],
        },
        {
          model: ProductCombination,
          as: "combinations",
          where: { productId },
          include: [
            {
              model: VariantValue,
              as: "values",
              through: { attributes: [] },
            },
          ],
          attributes: {
            include: ["deletedAt"],
          },
          paranoid: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  },

  create: async (data: CreateSupplierInput) => {
    return await Supplier.create({
      name: data.name,
      contact: data.contactName || data.code || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    });
  },

  update: async (id: number, data: UpdateSupplierInput) => {
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      throw new Error(`Supplier with ID ${id} not found`);
    }
    return await supplier.update({
      ...(data.name !== undefined && { name: data.name }),
      ...((data.contactName !== undefined || data.code !== undefined) && {
        contact: data.contactName || data.code || null,
      }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
    });
  },

  delete: async (id: number) => {
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      throw new Error(`Supplier with ID ${id} not found`);
    }
    await supplier.destroy();
    return { success: true, message: `Supplier ${id} deleted successfully` };
  },
};
