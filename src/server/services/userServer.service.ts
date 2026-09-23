import {
  UserInput,
  UserInputSchema,
  UserUpdateInput,
  UserUpdateSchema,
} from "@/schemas";
import { User } from "@/server/models";
import { PAGINATION } from "@/types/definitions";
import { Op } from "sequelize";
import "server-only";
import { handleServiceError } from "./errorHandler";

export interface ListUsersParams {
  q?: string | null;
  limit?: number;
  page?: number;
  sort?: string;
  order?: "ASC" | "DESC";
}

export const userServerService = {
  get: async (id: number) => {
    return await User.findByPk(id, {
      attributes: ["id", "name", "username", "email", "role", "isActive"],
    });
  },

  getAll: async () => {
    return await User.findAll({
      attributes: ["id", "name", "username", "email", "role", "isActive"],
      order: [["name", "ASC"]],
    });
  },

  getPaginated: async (params: ListUsersParams = {}) => {
    const {
      q = null,
      limit = PAGINATION.PAGE_SIZE,
      page = PAGINATION.PAGE,
      sort = "name",
      order = "ASC",
    } = params;

    try {
      const where = q
        ? {
            [Op.or]: [
              { name: { [Op.iLike]: `%${q}%` } },
              { email: { [Op.iLike]: `%${q}%` } },
              { username: { [Op.iLike]: `%${q}%` } },
            ],
          }
        : undefined;

      const offset = (page - 1) * limit;

      const { count, rows } = await User.findAndCountAll({
        attributes: ["id", "name", "username", "email", "role", "isActive"],
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
          currentPage: page,
        },
      };
    } catch (error) {
      handleServiceError(error);
    }
  },

  create: async (data: UserInput) => {
    const validatedData = UserInputSchema.parse(data);
    return await User.create({
      name: validatedData.name,
      username: validatedData.username,
      email: validatedData.email,
      password: User.generateHash(validatedData.password),
    });
  },

  update: async (id: number, data: UserUpdateInput) => {
    const validatedData = UserUpdateSchema.parse(data);
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    return await user.update({
      name: validatedData.name,
      username: validatedData.username,
      email: validatedData.email,
      role: validatedData.role,
      isActive: validatedData.isActive,
    });
  },

  delete: async (id: number) => {
    const user = await User.findByPk(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    await user.destroy();
    return { success: true, message: `User ${id} deleted successfully` };
  },

  changePassword: async (
    userId: number,
    oldPassword: string,
    newPassword: string,
  ) => {
    try {
      const user = await User.scope("withPassword").findByPk(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      if (!User.validatePassword(oldPassword, user.password)) {
        throw new Error("Incorrect current password");
      }
      await user.update({ password: User.generateHash(newPassword) });
      return { success: true, message: "Password updated successfully" };
    } catch (error) {
      handleServiceError(error);
    }
  },
};
