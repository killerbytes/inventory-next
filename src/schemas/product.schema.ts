import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { products } from "@/server/db/schema/products";
import { CategorySchema } from "./category.schema";
import { ProductCombinationSchema } from "./productCombination.schema";
import { VariantTypeSchema } from "./variantType.schema";
import z from "zod";

export const ProductBaseSchema = createInsertSchema(products, {
  categoryId: (schema) => schema.positive({ message: "Category is required" }),
  name: (schema) =>
    schema.min(2, {
      message: "Name must be at least 2 characters.",
    }),
  baseUnit: (schema) => schema.min(1, { message: "Base unit is required." }),
}).omit({
  id: true,
  searchText: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const ProductInputSchema = ProductBaseSchema.strict();
export const ProductUpdateSchema = ProductInputSchema.partial();

export const ProductSelectSchema = createSelectSchema(products).extend({
  searchText: z.string().nullish(),
});
export const ProductSchema = ProductSelectSchema.extend({
  category: CategorySchema,
  combinations: z.array(z.lazy(() => ProductCombinationSchema)).default([]),
  variants: z.array(VariantTypeSchema).nullish(),
});

export type ProductInput = z.infer<typeof ProductInputSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
export type ProductData = z.infer<typeof ProductSchema>;

