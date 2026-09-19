import z from "zod";

export const paymentApplicationBaseSchema = z.object({
  invoiceId: z.number(),
  amountApplied: z.coerce.number().positive(),
  paymentId: z.number().optional(),
  amountRemaining: z.coerce.number().nullish(),
});

export const paymentApplicationSchema = paymentApplicationBaseSchema.extend({
  id: z.number().optional(),
});

export type PaymentApplication = z.infer<typeof paymentApplicationSchema>;
