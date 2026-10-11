import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { productCombinations } from "@/server/db/schema/productCombinations";
import z from "zod";
import { InventorySchema } from "./inventory.schema";
import {
  VariantValueInputSchema,
  VariantValueSchema,
} from "./variantValue.schema";

const insertProductCombination = createInsertSchema(productCombinations, {
  productId: z.coerce.number().positive(),
  conversionFactor: z.coerce.number().positive().optional().nullable(),
  price: z.coerce.number().nonnegative().optional().nullable(),
  isBreakPack: z.boolean().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
});

export const ProductCombinationBaseSchema = z.object({
  productId: insertProductCombination.shape.productId,
  unit: insertProductCombination.shape.unit,
  conversionFactor: insertProductCombination.shape.conversionFactor,
  price: insertProductCombination.shape.price,
  reorderLevel: insertProductCombination.shape.reorderLevel,
  isBreakPack: insertProductCombination.shape.isBreakPack,
  isBreakPackOfId: insertProductCombination.shape.isBreakPackOfId,
  isActive: insertProductCombination.shape.isActive,
  values: z.array(z.lazy(() => VariantValueInputSchema)).nullish(),
});

export const ProductCombinationInputSchema =
  ProductCombinationBaseSchema.strict();

export const ProductCombinationUpdateSchema =
  ProductCombinationBaseSchema.extend({
    id: z.coerce.number().nullish(),
    name: z.string().nullish(),
    barcode: z.string().optional().nullable(),
    isDeleted: z.boolean().optional().nullable(),
  });

export const ProductCombinationSelectSchema =
  createSelectSchema(productCombinations);

export const ProductCombinationSchema =
  ProductCombinationSelectSchema.extend({
    price: z.coerce.number().optional().nullable(),
    conversionFactor: z.coerce.number().optional().nullable(),
    inventory: z
      .lazy(() => InventorySchema)
      .optional()
      .nullable(),
    barcode: z.string().optional().nullable(),
    values: z.array(z.lazy(() => VariantValueSchema)).nullish(),
    subItem: z
      .array(z.lazy(() => ProductCombinationBaseSchema))
      .optional()
      .nullable(),
  });

export type ProductCombinationInput = z.infer<
  typeof ProductCombinationInputSchema
>;
export type ProductCombinationUpdate = z.infer<
  typeof ProductCombinationUpdateSchema
>;
export type ProductCombinationData = z.infer<typeof ProductCombinationSchema>;

