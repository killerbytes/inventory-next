import z from "zod";

export const InventoryBaseSchema = z.object({
  combinationId: z.coerce.number(),
  quantity: z.coerce.number(),
  averagePrice: z.coerce.number().nullable(),
});

export const InventoryInputSchema = InventoryBaseSchema.strict();

export const InventoryUpdateSchema = InventoryBaseSchema.partial();

export const InventorySchema = InventoryBaseSchema.extend({
  id: z.coerce.number(),
});

export type InventoryInput = z.infer<typeof InventoryInputSchema>;
export type InventoryUpdateInput = z.infer<typeof InventoryUpdateSchema>;
export type InventoryData = z.infer<typeof InventorySchema>;
