import "server-only";
import db from "@/server/db/drizzle";
import { variantTypes, variantValues } from "@/server/db/schema";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { handleServiceError } from "./errorHandler";

export interface CreateVariantTypeInput {
  name: string;
  productId?: number;
  values?: any[];
  isTemplate?: boolean;
}

export interface UpdateVariantTypeInput {
  id?: number;
  name?: string;
  values?: any[];
  isBreakpackFilter?: boolean;
}

export const variantTypeServerService = {
  get: async (id: number) => {
    const result = await db.query.variantTypes.findFirst({
      where: eq(variantTypes.id, id),
      with: {
        values: true,
      },
    });
    return result ?? null;
  },

  getByProductId: async (productId: number) => {
    return await db.query.variantTypes.findMany({
      where: eq(variantTypes.productId, Number(productId)),
      with: {
        values: {
          orderBy: (val, { asc }) => [asc(val.value)],
        },
      },
      orderBy: [asc(variantTypes.id)],
    });
  },

  getAll: async (productId?: number) => {
    const where = productId
      ? eq(variantTypes.productId, Number(productId))
      : eq(variantTypes.isTemplate, true);
    return await db.query.variantTypes.findMany({
      where,
      with: {
        values: true,
      },
      orderBy: [asc(variantTypes.name)],
    });
  },

  create: async (data: CreateVariantTypeInput) => {
    try {
      return await db.transaction(async (tx) => {
        const [result] = await tx
          .insert(variantTypes)
          .values({
            name: data.name,
            productId: data.productId ?? null,
            isTemplate: data.isTemplate ?? false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        if (data.values && data.values.length > 0) {
          await tx.insert(variantValues).values(
            data.values.map((v: any) => ({
              value: v.value,
              variantTypeId: result.id,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          );
        }

        return result;
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  update: async (id: number, data: UpdateVariantTypeInput) => {
    const { id: _id, values = [], ...rest } = data;
    try {
      const existing = await db.query.variantTypes.findFirst({
        where: eq(variantTypes.id, id),
      });
      if (!existing) {
        throw new Error(`VariantType with ID ${id} not found`);
      }

      return await db.transaction(async (tx) => {
        if (data.isBreakpackFilter && existing.productId) {
          await tx
            .update(variantTypes)
            .set({ isBreakpackFilter: false, updatedAt: new Date() })
            .where(
              and(
                eq(variantTypes.productId, existing.productId),
                ne(variantTypes.id, id),
                eq(variantTypes.isBreakpackFilter, true),
              ),
            );
        }

        await tx
          .update(variantTypes)
          .set({ ...rest, updatedAt: new Date() })
          .where(eq(variantTypes.id, id));

        const existingValues = await tx.query.variantValues.findMany({
          where: eq(variantValues.variantTypeId, existing.id),
        });

        const incomingIds = values
          .map((i: any) => i.id)
          .filter(Boolean) as number[];
        const deleteIds = existingValues
          .map((i) => i.id)
          .filter((itemId) => !incomingIds.includes(itemId));

        if (deleteIds.length > 0) {
          await tx
            .delete(variantValues)
            .where(inArray(variantValues.id, deleteIds));
        }

        for (const value of values) {
          if (value?.id) {
            await tx
              .update(variantValues)
              .set({ value: value.value, updatedAt: new Date() })
              .where(eq(variantValues.id, value.id));
          } else {
            await tx.insert(variantValues).values({
              variantTypeId: existing.id,
              value: value.value,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        return await tx.query.variantTypes.findFirst({
          where: eq(variantTypes.id, id),
          with: {
            values: true,
          },
        });
      });
    } catch (error) {
      handleServiceError(error);
    }
  },

  delete: async (id: number) => {
    const existing = await db.query.variantTypes.findFirst({
      where: eq(variantTypes.id, id),
    });
    if (!existing) {
      throw new Error(`VariantType with ID ${id} not found`);
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(variantValues)
        .where(eq(variantValues.variantTypeId, id));
      await tx
        .delete(variantTypes)
        .where(eq(variantTypes.id, id));
    });

    return { success: true, message: `VariantType ${id} deleted successfully` };
  },
};
export default variantTypeServerService;
