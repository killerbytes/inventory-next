import {
  CategoryInput,
  CategoryInputSchema,
  CategoryUpdateInput,
  CategoryUpdateSchema,
} from "@/schemas";
import sequelize from "@/server/db/sequelize";
import { Category } from "@/server/models";
import "server-only";

export const categoryServerService = {
  get: async (id: number) => {
    const category = await Category.findByPk(id, {
      include: [{ model: Category, as: "subCategories" }],
    });

    return category?.get({ plain: true });
  },

  getAll: async () => {
    const categories = await Category.findAll({
      order: [["order", "ASC"]],
    });
    return categories.map((c) => c.get({ plain: true }));
  },

  create: async (data: CategoryInput) => {
    const validatedData = CategoryInputSchema.parse(data);
    return await Category.create({
      name: validatedData.name,
      description: validatedData.description || null,
      order: validatedData.order ?? null,
      parentId: validatedData.parentId ?? null,
    });
  },

  update: async (id: number, data: CategoryUpdateInput) => {
    const validatedData = CategoryUpdateSchema.parse(data);
    const category = await Category.findByPk(id);
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }
    return await category.update(validatedData);
  },

  delete: async (id: number) => {
    const category = await Category.findByPk(id);
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }
    await category.destroy();
    return { success: true, message: `Category ${id} deleted successfully` };
  },

  updateSort: async (payload: (number | string)[]) => {
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
  },
};
