import {
  CategoryInput,
  CategoryInputSchema,
  CategoryUpdateInput,
  CategoryUpdateSchema,
} from "@/schemas";
import sequelize from "@/server/db/sequelize";
import { Category } from "@/server/models";
import "server-only";
import { handleServiceError } from "./errorHandler";

export const categoryServerService = {
  get: async (id: number) => {
    return await Category.findByPk(id, {
      include: [{ model: Category, as: "subCategories" }],
    });
  },

  getAll: async () => {
    return await Category.findAll({
      order: [["order", "ASC"]],
    });
  },

  create: async (data: CategoryInput) => {
    const validatedData = CategoryInputSchema.parse(data);
    try {
      return await Category.create({
        name: validatedData.name,
        description: validatedData.description || null,
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  update: async (id: number, data: CategoryUpdateInput) => {
    const validatedData = CategoryUpdateSchema.parse(data);
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        throw new Error(`Category with ID ${id} not found`);
      }
      return await category.update(validatedData);
    } catch (error) {
      handleServiceError(error);
    }
  },

  delete: async (id: number) => {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        throw new Error(`Category with ID ${id} not found`);
      }
      await category.destroy();
      return { success: true, message: `Category ${id} deleted successfully` };
    } catch (error) {
      handleServiceError(error);
    }
  },

  updateSort: async (payload: (number | string)[]) => {
    try {
      return await sequelize.transaction(async (transaction) => {
        await Promise.all(
          payload.map(async (id, index) => {
            const category = await Category.findByPk(Number(id), { transaction });
            if (!category) return;
            await category.update({ order: index }, { transaction });
          }),
        );
        return true;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },
};
