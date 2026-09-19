import z from "zod";

export const CategoryBaseSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  parentId: z.number().nullish(),
  description: z.string().optional().nullish(),
  order: z.number().nullish(),
});

export const CategoryInputSchema = CategoryBaseSchema.strict();
export const CategoryUpdateSchema = CategoryInputSchema.partial();
export const CategorySchema = CategoryBaseSchema.extend({
  id: z.coerce.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional().nullable(),
});

export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type CategoryUpdateInput = z.infer<typeof CategoryUpdateSchema>;
export type CategoryData = z.infer<typeof CategorySchema>;
