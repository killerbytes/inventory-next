import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { stockAdjustments } from "@/server/db/schema/stockAdjustments";
import z from "zod";

export const stockAdjustmentBaseSchema = createInsertSchema(stockAdjustments, {
  newQuantity: () => z.coerce.number(),
  reason: () => z.string(),
})
  .omit({
    id: true,
    referenceNo: true,
    systemQuantity: true,
    difference: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  })
  // .extend (not a createInsertSchema override) because drizzle-zod re-applies the
  // column's nullability to overrides; the DB column is nullable but an adjustment
  // always targets a product.
  .extend({
    combinationId: z.number().int().positive(),
    // StockAdjustments.notes is varchar(255): longer notes would fail at the DB.
    notes: z.string().max(255, "Notes must be 255 characters or fewer.").nullish(),
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

