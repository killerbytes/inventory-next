import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { categories } from "@/server/db/schema/categories";
import z from "zod";

export const CategoryBaseSchema = createInsertSchema(categories, {
  name: (schema) =>
    schema.min(2, {
      message: "Name must be at least 2 characters.",
    }),
}).omit({
  id: true,
});

export const CategoryInputSchema = CategoryBaseSchema.strict();
export const CategoryUpdateSchema = CategoryInputSchema.partial();
export const CategorySelectSchema = createSelectSchema(categories).extend({
  description: z.string().optional().nullable(),
  order: z.number().optional().nullable(),
  parentId: z.number().optional().nullable(),
  createdAt: z.coerce.date().optional().nullable(),
  updatedAt: z.coerce.date().optional().nullable(),
  deletedAt: z.coerce.date().optional().nullable(),
});
export const CategorySchema = CategorySelectSchema;

export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
export type CategoryData = z.infer<typeof CategorySchema>;

