import {
  CustomerInput,
  CustomerInputSchema,
  CustomerUpdateInput,
  CustomerUpdateSchema,
} from "@/schemas";
import { Customer } from "@/server/models";
import { Op } from "sequelize";
import "server-only";

export interface GetCustomerPaginatedInput {
  limit?: number;
  page?: number;
  q?: string | null;
  sort?: string;
  order?: "ASC" | "DESC";
}

export const customerServerService = {
  get: async (id: number) => {
    const customer = await Customer.findByPk(id);
    return customer?.get({ plain: true });
  },

  getAll: async () => {
    const customers = await Customer.findAll({
      order: [["name", "ASC"]],
    });
    return customers.map((c) => c.get({ plain: true }));
  },

  getPaginated: async (params: GetCustomerPaginatedInput = {}) => {
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
            { email: { [Op.iLike]: `%${q}%` } },
            { name: { [Op.iLike]: `%${q}%` } },
            { phone: { [Op.iLike]: `%${q}%` } },
            { notes: { [Op.iLike]: `%${q}%` } },
          ],
        }
      : undefined;

    const { count, rows } = await Customer.findAndCountAll({
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

  create: async (data: CustomerInput) => {
    const validatedData = CustomerInputSchema.parse(data);
    return await Customer.create(validatedData);
  },

  update: async (id: number, data: CustomerUpdateInput) => {
    const validatedData = CustomerUpdateSchema.parse(data);
    const customer = await Customer.findByPk(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    return await customer.update(validatedData);
  },

  delete: async (id: number) => {
    const customer = await Customer.findByPk(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    await customer.destroy();
    return { success: true, message: `Customer ${id} deleted successfully` };
  },
};
