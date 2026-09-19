import z from "zod";

export const CustomerBaseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  address: z.string().optional().nullable(),
  contact: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .or(z.literal("").transform(() => null))
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const CustomerInputSchema = CustomerBaseSchema.strict();
export const CustomerUpdateSchema = CustomerInputSchema.partial();
export const CustomerSchema = CustomerBaseSchema.extend({
  id: z.coerce.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.coerce.date().optional().nullable(),
});

export type CustomerInput = z.infer<typeof CustomerInputSchema>;
export type CustomerUpdateInput = z.infer<typeof CustomerUpdateSchema>;
export type CustomerData = z.infer<typeof CustomerSchema>;
