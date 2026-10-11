import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { customers } from "@/server/db/schema/customers";
import z from "zod";

export const CustomerBaseSchema = createInsertSchema(customers, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters."),
  email: () =>
    z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address.")
      .or(z.literal("").transform(() => null))
      .optional()
      .nullable(),
  isActive: () => z.boolean().optional(),
})
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  })
  .extend({
    contact: z.string().optional().nullable(),
  });

export const CustomerInputSchema = CustomerBaseSchema.strict();
export const CustomerUpdateSchema = CustomerInputSchema.partial();
export const CustomerSelectSchema = createSelectSchema(customers);
export const CustomerSchema = CustomerSelectSchema.extend({
  contact: z.string().optional().nullable(),
});

export type CustomerInput = z.infer<typeof CustomerInputSchema>;
export type CustomerUpdateInput = z.infer<typeof CustomerUpdateSchema>;
export type CustomerData = z.infer<typeof CustomerSchema>;

