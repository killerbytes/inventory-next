import * as z from "zod";

export const BreakPackBaseSchema = z.object({
  fromCombinationId: z.coerce.number().positive(),
  toCombinationId: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
});

export const BreakPackInputSchema = BreakPackBaseSchema.strict();

export const BreakPackSchema = BreakPackBaseSchema.extend({
  id: z.number(),
  createdAt: z.string(),
  createdBy: z.number(),
  conversionFactor: z.coerce.number(),
  type: z.string(),
});

export type BreakPackInput = z.infer<typeof BreakPackInputSchema>;
export type BreakPackData = z.infer<typeof BreakPackSchema>;
