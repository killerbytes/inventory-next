import z from "zod";
import { CategorySchema } from "./category.schema";
import { ProductCombinationSchema } from "./productCombination.schema";
import { VariantTypeSchema } from "./variantType.schema";

export const ProductBaseSchema = z.object({
  categoryId: z.number().positive({ message: "Category is required" }),
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().optional().nullable(),
  baseUnit: z.string().min(1, { message: "Base unit is required." }),
});

export const ProductInputSchema = ProductBaseSchema.strict();
export const ProductUpdateSchema = ProductInputSchema.partial();
export const ProductSchema = ProductBaseSchema.extend({
  id: z.coerce.number(),
  sku: z.string(),
  category: CategorySchema,
  combinations: z.array(z.lazy(() => ProductCombinationSchema)).default([]),
  variants: z.array(VariantTypeSchema).nullish(),
});

export type ProductInput = z.infer<typeof ProductInputSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
export type ProductData = z.infer<typeof ProductSchema>;
