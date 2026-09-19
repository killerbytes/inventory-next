import z from "zod";

export const stockAdjustmentBaseSchema = z.object({
  combinationId: z.number(),
  newQuantity: z.coerce.number(),
  reason: z.string(),
  notes: z.string().optional().nullable(),
});

export const stockAdjustmentInputSchema = stockAdjustmentBaseSchema.strict();
export const stockAdjustmentSchema = stockAdjustmentBaseSchema.extend({
  id: z.number(),
  createdBy: z.number(),
  referenceNo: z.string().optional().nullable(),
  systemQuantity: z.number(),
  difference: z.number(),
});

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentInputSchema>;
export type StockAdjustmentData = z.infer<typeof stockAdjustmentSchema>;
