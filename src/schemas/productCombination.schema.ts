import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { productCombinations } from "@/server/db/schema/productCombinations";
import z from "zod";
import { InventorySchema } from "./inventory.schema";
import {
  VariantValueInputSchema,
  VariantValueSchema,
} from "./variantValue.schema";

// 1. Base Insert Schema (override Drizzle types where necessary)
const insertProductCombination = createInsertSchema(productCombinations, {
  productId: z.number().positive(), // Removed coerce assuming JSON payload
  conversionFactor: z.coerce.number().positive().nullish(), // Replaced .optional().nullable()
  price: z.coerce.number().nonnegative().nullish(),
  isBreakPack: z.boolean().nullish(),
  isActive: z.boolean().nullish(),
});

// 2. Base Schema: Extend directly instead of mapping shapes
export const ProductCombinationBaseSchema = insertProductCombination.extend({
  values: z.array(z.lazy(() => VariantValueInputSchema)).nullish(),
});

// 3. Input Schema
export const ProductCombinationInputSchema = ProductCombinationBaseSchema.strict();

// 4. Update Schema: Make all base fields partial, require ID
export const ProductCombinationUpdateSchema = ProductCombinationBaseSchema.partial().extend({
  id: z.number().nullish(), // An update usually requires a valid ID
  name: z.string().nullish(),
  barcode: z.string().nullish(),
  isDeleted: z.boolean().nullish(),
});

// 5. Select Schemas
export const ProductCombinationSelectSchema = createSelectSchema(productCombinations);

export const ProductCombinationSchema = ProductCombinationSelectSchema.extend({
  price: z.coerce.number().nullish(),
  conversionFactor: z.coerce.number().nullish(),
  inventory: z.lazy(() => InventorySchema).nullish(),
  barcode: z.string().nullish(),
  values: z.array(z.lazy(() => VariantValueSchema)).nullish(),
  // Use z.lazy for recursive self-references
  subItem: z.array(z.lazy(() => ProductCombinationBaseSchema)).nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// 6. Type Exports
export type ProductCombinationInput = z.infer<typeof ProductCombinationInputSchema>;
export type ProductCombinationUpdate = z.infer<typeof ProductCombinationUpdateSchema>;
export type ProductCombinationData = z.infer<typeof ProductCombinationSchema>;

// 7. Specialized Endpoint Schemas
export const updateCombinationPriceSchema = z.object({
  combinationId: z.coerce.number().positive(),
  price: z.coerce.number().positive("Price must be greater than 0"),
});

export type UpdateCombinationPriceInput = z.infer<typeof updateCombinationPriceSchema>;