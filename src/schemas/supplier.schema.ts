import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { suppliers } from "@/server/db/schema/suppliers";
import z from "zod";

export const SupplierBaseSchema = createInsertSchema(suppliers, {
  name: (schema) =>
    schema.min(2, {
      message: "Name must be at least 2 characters.",
    }),
  email: () =>
    z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email address.")
      .or(z.string().trim().max(0).transform(() => null))
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
    contactName: z.string().optional().nullable(),
    code: z.string().optional().nullable(),
  });

export const SupplierInputSchema = SupplierBaseSchema.strict();
export const SupplierUpdateSchema = SupplierInputSchema.partial();
export const SupplierSelectSchema = createSelectSchema(suppliers);
export const SupplierSchema = SupplierSelectSchema.extend({
  contactName: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
});

export type SupplierInput = z.infer<typeof SupplierInputSchema>;
export type SupplierUpdateInput = z.infer<typeof SupplierUpdateSchema>;
export type SupplierData = z.infer<typeof SupplierSchema>;

