import z from "zod";

export const VariantValueBaseSchema = z.object({
  value: z.string(),
  variantTypeId: z.coerce.number().positive(),
  id: z.coerce.number(),
});

export const VariantValueInputSchema = VariantValueBaseSchema.strict();

export const VariantValueSchema = VariantValueBaseSchema;

export type VariantValueInput = z.infer<typeof VariantValueInputSchema>;
export type VariantValueData = z.infer<typeof VariantValueSchema>;
