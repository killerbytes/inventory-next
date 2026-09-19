import z from "zod";

export const SupplierBaseSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  address: z
    .string()
    .min(2, {
      message: "Address must be at least 2 characters.",
    })
    .optional()
    .nullable(),
  contact: z.string().optional().nullable(),
  phone: z
    .string()
    .min(2, {
      message: "Phone must be at least 2 characters.",
    })
    .optional()
    .nullable(),
  email: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean(),
});

export const SupplierInputSchema = SupplierBaseSchema.strict();
export const SupplierUpdateSchema = SupplierInputSchema.partial();

export const SupplierSchema = SupplierBaseSchema.extend({
  id: z.number(),
});

export type SupplierInput = z.infer<typeof SupplierInputSchema>;
export type SupplierUpdateInput = z.infer<typeof SupplierUpdateSchema>;
export type SupplierData = z.infer<typeof SupplierSchema>;
