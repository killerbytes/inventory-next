import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { inventories } from "@/server/db/schema/inventories";
import z from "zod";

export const InventoryBaseSchema = createInsertSchema(inventories, {
  combinationId: () => z.coerce.number(),
  quantity: () => z.coerce.number(),
  averagePrice: () => z.coerce.number().nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const InventoryInputSchema = InventoryBaseSchema.strict();
export const InventoryUpdateSchema = InventoryBaseSchema.partial();
export const InventorySelectSchema = createSelectSchema(inventories).extend({
  quantity: z.coerce.number(),
  averagePrice: z.coerce.number().nullable(),
});
export const InventorySchema = InventorySelectSchema.extend({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type InventoryInput = z.infer<typeof InventoryInputSchema>;
export type InventoryUpdateInput = z.infer<typeof InventoryUpdateSchema>;
export type InventoryData = z.infer<typeof InventorySchema>;

