import { getMappedProductComboName } from "@/lib/mapped";
import { getSKU } from "@/lib/string";
import { ProductBaseSchema } from "@/schemas";
import { db } from "@/server/db/drizzle";
import { products } from "@/server/db/schema/products";
import { productCombinations, combinationValues } from "@/server/db/schema/productCombinations";
import { variantTypes, variantValues } from "@/server/db/schema/variantTypes";
import { inventories } from "@/server/db/schema/inventories";
import {
  eq,
  sql,
} from "drizzle-orm";
import "server-only";


export interface CreateProductInput {
  name: string;
  sku?: string | null;
  categoryId?: number | string | null;
  baseUnit?: string;
  description?: string | null;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string | null;
  categoryId?: number | string | null;
  baseUnit?: string;
  description?: string | null;
}

export const productServerService = {
  get: async (id: number) => {
    const result = await db.query.products.findFirst({
      where: (tbl, { eq, and, isNull }) =>
        and(eq(tbl.id, id), isNull(tbl.deletedAt)),
      with: {
        category: true,
        variants: {
          orderBy: (tbl, { asc }) => asc(tbl.id),
          with: {
            values: {
              orderBy: (tbl, { asc }) => asc(tbl.id),
            },
          },
        },
        combinations: {
          where: (tbl, { isNull }) => isNull(tbl.deletedAt),
          orderBy: (tbl, { asc }) => asc(tbl.name),
          with: {
            inventory: true,
            combinationValues: {
              with: {
                value: true,
              },
            },
          },
        },
      },
    });
    if (!result) return null;

    const formattedCombinations = (result.combinations || []).map(
      (combo: any) => ({
        ...combo,
        values: (combo.combinationValues || [])
          .map((cv: any) => cv.value)
          .filter(Boolean),
      }),
    );

    return {
      ...result,
      combinations: formattedCombinations,
    };
  },

  getAll: async () => {
    return await db.query.products.findMany({
      where: (tbl, { isNull }) => isNull(tbl.deletedAt),
      with: { category: true },
      orderBy: (tbl, { asc }) => asc(tbl.name),
    });
  },

  create: async (data: CreateProductInput) => {
    const validatedData = ProductBaseSchema.parse(data);
    return await db.transaction(async (tx) => {
      // Check composite unique constraint on (name, baseUnit)
      const existing = await tx.query.products.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(
            eq(tbl.name, validatedData.name),
            eq(tbl.baseUnit, validatedData.baseUnit || "PCS"),
            isNull(tbl.deletedAt),
          ),
      });
      if (existing) {
        const err: any = new Error("Validation error");
        err.name = "SequelizeUniqueConstraintError";
        err.errors = [
          { message: "name must be unique", path: "name" },
          { message: "baseUnit must be unique", path: "baseUnit" },
        ];
        err.fields = {
          name: validatedData.name,
          baseUnit: validatedData.baseUnit || "PCS",
        };
        throw err;
      }

      const categoryId = validatedData.categoryId
        ? Number(validatedData.categoryId)
        : 1;
      const baseUnit = validatedData.baseUnit || "PCS";
      const computedSku =
        data.sku || getSKU(validatedData.name, categoryId);

      const [product] = await tx
        .insert(products)
        .values({
          name: validatedData.name,
          sku: computedSku,
          categoryId,
          baseUnit,
          description: data.description || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      await productServerService.syncCombinationNames(product.id, tx);
      await productServerService.rebuildProductSearchText(product.id, tx);
      return product;
    });
  },

  update: async (id: number, data: UpdateProductInput) => {
    return await db.transaction(async (tx) => {
      const product = await tx.query.products.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, id), isNull(tbl.deletedAt)),
      });
      if (!product) {
        throw new Error(`Product with ID ${id} not found`);
      }

      const targetName = data.name ?? product.name;
      const targetBaseUnit = data.baseUnit ?? product.baseUnit;

      if (
        (data.name && data.name !== product.name) ||
        (data.baseUnit && data.baseUnit !== product.baseUnit)
      ) {
        const existing = await tx.query.products.findFirst({
          where: (tbl, { eq, and, isNull, ne }) =>
            and(
              eq(tbl.name, targetName),
              eq(tbl.baseUnit, targetBaseUnit),
              ne(tbl.id, id),
              isNull(tbl.deletedAt),
            ),
        });
        if (existing) {
          const err: any = new Error("Validation error");
          err.name = "SequelizeUniqueConstraintError";
          err.errors = [
            { message: "name must be unique", path: "name" },
            { message: "baseUnit must be unique", path: "baseUnit" },
          ];
          err.fields = { name: targetName, baseUnit: targetBaseUnit };
          throw err;
        }
      }

      const targetCategoryId =
        data.categoryId !== undefined
          ? Number(data.categoryId)
          : product.categoryId;

      const updateData: any = {
        updatedAt: new Date(),
      };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.categoryId !== undefined) updateData.categoryId = targetCategoryId;
      if (data.baseUnit !== undefined) updateData.baseUnit = data.baseUnit;
      if (data.description !== undefined)
        updateData.description = data.description;
      updateData.sku =
        data.sku || getSKU(targetName, targetCategoryId);

      const [updated] = await tx
        .update(products)
        .set(updateData)
        .where(eq(products.id, id))
        .returning();

      await productServerService.syncCombinationNames(id, tx);
      await productServerService.rebuildProductSearchText(id, tx);
      return updated;
    });
  },

  delete: async (id: number) => {
    return await db.transaction(async (tx) => {
      const product = await tx.query.products.findFirst({
        where: (tbl, { eq, and, isNull }) =>
          and(eq(tbl.id, id), isNull(tbl.deletedAt)),
      });
      if (!product) {
        throw new Error(`Product with ID ${id} not found`);
      }

      const combos = await tx.query.productCombinations.findMany({
        where: (tbl, { eq }) => eq(tbl.productId, id),
      });

      for (const combo of combos) {
        await tx
          .delete(inventories)
          .where(eq(inventories.combinationId, combo.id));
        await tx
          .delete(combinationValues)
          .where(eq(combinationValues.combinationId, combo.id));
      }

      await tx
        .delete(productCombinations)
        .where(eq(productCombinations.productId, id));

      const vTypes = await tx.query.variantTypes.findMany({
        where: (tbl, { eq }) => eq(tbl.productId, id),
      });
      for (const vt of vTypes) {
        await tx
          .delete(variantValues)
          .where(eq(variantValues.variantTypeId, vt.id));
      }
      await tx.delete(variantTypes).where(eq(variantTypes.productId, id));

      await tx.delete(products).where(eq(products.id, id));
      return { success: true, message: `Product ${id} deleted successfully` };
    });
  },

  syncCombinationNames: async (productId: number, transaction?: any) => {
    const client = transaction || db;
    const product = await client.query.products.findFirst({
      where: (tbl: any, { eq, and, isNull }: any) =>
        and(eq(tbl.id, productId), isNull(tbl.deletedAt)),
      with: {
        variants: {
          with: {
            values: true,
          },
        },


        combinations: {
          where: (tbl: any, { isNull }: any) => isNull(tbl.deletedAt),
          with: {
            combinationValues: {
              with: {
                value: true,
              },
            },
          },
        },
      },
    });

    if (
      !product ||
      !product.combinations ||
      product.combinations.length === 0
    ) {
      return;
    }

    for (const combo of product.combinations) {
      const values = (combo.combinationValues || [])
        .map((cv: any) => cv.value)
        .filter(Boolean);

      const name = getMappedProductComboName(product, values);
      const sku = getSKU(
        product.name,
        product.categoryId,
        combo.unit || product.baseUnit,
        values,
      );

      await client
        .update(productCombinations)
        .set({ name, sku, updatedAt: new Date() })
        .where(eq(productCombinations.id, combo.id));
    }
  },

  rebuildProductSearchText: async (productId: number, transaction?: any) => {
    const client = transaction || db;
    await client.execute(sql`
      UPDATE "Products" p
      SET search_text = (
        setweight(to_tsvector('simple', COALESCE(p.name, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(p.description, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(p.sku, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(
          (
            SELECT string_agg(pc.name || ' ' || COALESCE(pc.sku, '') || ' ' || COALESCE(pc.barcode, ''), ' ')
            FROM "ProductCombinations" pc
            WHERE pc."productId" = p.id AND pc."deletedAt" IS NULL
          ), ''
        )), 'B') ||
        setweight(to_tsvector('simple', COALESCE(
          (
            SELECT string_agg(vv.value, ' ')
            FROM "VariantTypes" vt
            JOIN "VariantValues" vv ON vv."variantTypeId" = vt.id
            WHERE vt."productId" = p.id
          ), ''
        )), 'C')
      )
      WHERE p.id = ${productId}
    `);
  },
};
