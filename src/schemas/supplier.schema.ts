import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { suppliers } from "@/server/db/schema/suppliers";
import z from "zod";

export const SupplierBaseSchema = createInsertSchema(suppliers, {
  name: (schema) =>
    schema.min(2, {
      message: "Name must be at least 2 characters.",
    }),
  address: (schema) =>
    schema
      .min(2, {
        message: "Address must be at least 2 characters.",
      })
      .optional()
      .nullable(),
  phone: (schema) =>
    schema
      .min(2, {
        message: "Phone must be at least 2 characters.",
      })
      .optional()
      .nullable(),
  email: (schema) =>
    schema
      .email({
        message: "Please enter a valid email address.",
      })
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

