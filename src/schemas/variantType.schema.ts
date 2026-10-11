import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { variantTypes } from "@/server/db/schema/variantTypes";
import z from "zod";
import { VariantValueBaseSchema } from "./variantValue.schema";

export const VariantTypesBaseSchema = createInsertSchema(variantTypes, {
  productId: () => z.coerce.number().positive(),
  isTemplate: () => z.coerce.boolean().nullish(),
  isBreakpackFilter: () => z.coerce.boolean().nullish(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const VariantTypeSelectSchema = createSelectSchema(variantTypes);
export const VariantTypeSchema = VariantTypeSelectSchema.extend({
  values: z.array(VariantValueBaseSchema),
  createdAt: z.union([z.string(), z.date()]).optional().nullable(),
  updatedAt: z.union([z.string(), z.date()]).optional().nullable(),
});

export type VariantTypeData = z.infer<typeof VariantTypeSchema>;

