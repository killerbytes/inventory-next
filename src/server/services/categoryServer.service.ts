import {
  CategoryInput,
  CategoryInputSchema,
  CategoryUpdateInput,
  CategoryUpdateSchema,
} from "@/schemas";
import "server-only";
import db from "@/server/db/drizzle";
import { categories } from "@/server/db/schema";
import { asc, eq } from "drizzle-orm";

export const categoryServerService = {
  get: async (id: number) => {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, id),
      with: {
        subCategories: true,
      },
    });

    return category ?? null;
  },

  getAll: async () => {
    return await db.query.categories.findMany({
      orderBy: [asc(categories.order)],
    });
  },

  create: async (data: CategoryInput) => {
    try {
      const validatedData = CategoryInputSchema.parse(data);
      const [created] = await db
        .insert(categories)
        .values({
          name: validatedData.name,
          description: validatedData.description || null,
          order: validatedData.order ?? null,
          parentId: validatedData.parentId ?? null,
        })
        .returning();
      return created;
    } catch (err: any) {
      const code = err.code || err.cause?.code;
      const detail = err.detail || err.cause?.detail;
      if (code === "23505") {
        const error: any = new Error("Unique constraint violation");
        error.name = "SequelizeUniqueConstraintError";
        error.fields = detail?.includes("name") ? ["name"] : ["id"];
        throw error;
      }
      throw err;
    }
  },

  update: async (id: number, data: CategoryUpdateInput) => {
    try {
      const validatedData = CategoryUpdateSchema.parse(data);
      const existing = await db.query.categories.findFirst({
        where: eq(categories.id, id),
      });
      if (!existing) {
        throw new Error(`Category with ID ${id} not found`);
      }

      const [updated] = await db
        .update(categories)
        .set(validatedData)
        .where(eq(categories.id, id))
        .returning();
      return updated;
    } catch (err: any) {
      const code = err.code || err.cause?.code;
      const detail = err.detail || err.cause?.detail;
      if (code === "23505") {
        const error: any = new Error("Unique constraint violation");
        error.name = "SequelizeUniqueConstraintError";
        error.fields = detail?.includes("name") ? ["name"] : ["id"];
        throw error;
      }
      throw err;
    }
  },

  delete: async (id: number) => {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });
    if (!existing) {
      throw new Error(`Category with ID ${id} not found`);
    }
    await db.delete(categories).where(eq(categories.id, id));
    return { success: true, message: `Category ${id} deleted successfully` };
  },

  updateSort: async (payload: (number | string)[]) => {
    return await db.transaction(async (tx) => {
      for (let index = 0; index < payload.length; index++) {
        const id = Number(payload[index]);
        await tx
          .update(categories)
          .set({ order: index })
          .where(eq(categories.id, id));
      }
      return true;
    });
  },
};
export default categoryServerService;
