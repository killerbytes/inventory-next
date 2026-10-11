import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { paymentApplications } from "@/server/db/schema/payments";
import z from "zod";

export const paymentApplicationBaseSchema = createInsertSchema(
  paymentApplications,
  {
    invoiceId: () => z.number(),
    amountApplied: () => z.coerce.number().positive(),
    paymentId: () => z.number().optional(),
    amountRemaining: () => z.coerce.number().nullish(),
  },
).pick({
  invoiceId: true,
  amountApplied: true,
  paymentId: true,
  amountRemaining: true,
});

export const paymentApplicationSelectSchema =
  createSelectSchema(paymentApplications);
export const paymentApplicationSchema = paymentApplicationBaseSchema.extend({
  id: z.number().optional(),
});

export type PaymentApplication = z.infer<typeof paymentApplicationSchema>;

