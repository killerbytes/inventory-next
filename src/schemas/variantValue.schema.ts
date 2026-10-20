import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { variantValues } from "@/server/db/schema/variantTypes";
import z from "zod";

export const VariantValueBaseSchema = createInsertSchema(variantValues, {
  variantTypeId: (schema) => schema.positive(),
  id: () => z.coerce.number(),
}).partial();

export const VariantValueInputSchema = VariantValueBaseSchema.strict();
export const VariantValueSelectSchema = createSelectSchema(variantValues);
export const VariantValueSchema = VariantValueBaseSchema.extend({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type VariantValueInput = z.infer<typeof VariantValueInputSchema>;
export type VariantValueData = z.infer<typeof VariantValueSchema>;

