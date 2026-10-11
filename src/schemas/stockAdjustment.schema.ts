import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { stockAdjustments } from "@/server/db/schema/stockAdjustments";
import z from "zod";

export const stockAdjustmentBaseSchema = createInsertSchema(stockAdjustments, {
  combinationId: () => z.number(),
  newQuantity: () => z.coerce.number(),
  reason: () => z.string(),
  notes: () => z.string().optional().nullable(),
}).omit({
  id: true,
  referenceNo: true,
  systemQuantity: true,
  difference: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export const stockAdjustmentInputSchema = stockAdjustmentBaseSchema.strict();
export const stockAdjustmentSelectSchema = createSelectSchema(stockAdjustments).extend({
  systemQuantity: z.coerce.number(),
  newQuantity: z.coerce.number(),
  difference: z.coerce.number(),
});
export const stockAdjustmentSchema = stockAdjustmentSelectSchema;

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentInputSchema>;
export type StockAdjustmentData = z.infer<typeof stockAdjustmentSchema>;

