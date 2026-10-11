import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { breakPacks } from "@/server/db/schema/breakPacks";
import * as z from "zod";

export const BreakPackBaseSchema = createInsertSchema(breakPacks, {
  fromCombinationId: () => z.coerce.number().positive(),
  toCombinationId: () => z.coerce.number().positive(),
  quantity: () =>
    z
      .number({ invalid_type_error: "Quantity must be a number" })
      .int("Quantity must be a whole number")
      .positive(),
}).omit({
  id: true,
  conversionFactor: true,
  type: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export const BreakPackInputSchema = BreakPackBaseSchema.strict();

export const BreakPackSelectSchema = createSelectSchema(breakPacks);
export const BreakPackSchema = BreakPackSelectSchema.extend({
  createdAt: z.union([z.string(), z.date()]).optional(),
  conversionFactor: z.coerce.number(),
});

export type BreakPackInput = z.infer<typeof BreakPackInputSchema>;
export type BreakPackData = z.infer<typeof BreakPackSchema>;

