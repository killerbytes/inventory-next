import z from "zod";
import { VariantValueBaseSchema } from "./variantValue.schema";

export const VariantTypesBaseSchema = z.object({
  name: z.string(),
  productId: z.coerce.number().positive(),
  isTemplate: z.coerce.boolean().nullish(),
  isBreakpackFilter: z.coerce.boolean().nullish(),
});

export const VariantTypeSchema = VariantTypesBaseSchema.extend({
  id: z.number(),
  values: z.array(VariantValueBaseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type VariantTypeData = z.infer<typeof VariantTypeSchema>;
