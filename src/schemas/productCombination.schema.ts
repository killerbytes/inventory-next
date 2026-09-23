import z from "zod";
import { InventorySchema } from "./inventory.schema";
import {
  VariantValueInputSchema,
  VariantValueSchema,
} from "./variantValue.schema";

export const ProductCombinationBaseSchema = z.object({
  productId: z.coerce.number().positive(),
  unit: z.string(),
  conversionFactor: z.coerce.number().positive().optional().nullable(),
  price: z.coerce.number().nonnegative().optional().nullable(),
  reorderLevel: z.number().optional().nullable(),
  isBreakPack: z.boolean().optional().nullable(),
  isBreakPackOfId: z.coerce.number().optional().nullish(),
  isActive: z.boolean().optional().nullable(),
  values: z.array(z.lazy(() => VariantValueInputSchema)).nullish(),
});

export const ProductCombinationInputSchema =
  ProductCombinationBaseSchema.strict();

export const ProductCombinationUpdateSchema =
  ProductCombinationBaseSchema.extend({
    id: z.coerce.number().nullish(),
    name: z.string().nullish(),
    price: z.coerce.number().positive(),
  });

export const ProductCombinationSchema = ProductCombinationBaseSchema.extend({
  id: z.coerce.number(),
  name: z.string(),
  sku: z.string().nullish(),
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
