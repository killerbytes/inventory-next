import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { payments } from "@/server/db/schema/payments";
import z from "zod";
import { paymentApplicationBaseSchema } from "./paymentApplication.schema";
import { SupplierSchema } from "./supplier.schema";

export const paymentBaseSchema = createInsertSchema(payments, {
  supplierId: () => z.number().optional(),
  referenceNo: () => z.string().nullish(),
  paymentDate: () => z.string().optional() as any,
  amount: () => z.coerce.number().nullish() as any,
  notes: () => z.string().nullish(),
})
  .pick({
    supplierId: true,
    referenceNo: true,
    paymentDate: true,
    amount: true,
    notes: true,
  })
  .extend({
    invoiceId: z.number().optional(),
    referenceNumber: z.string().nullish(),
    modeOfPayment: z.string().optional(),
  });

export const paymentInputSchema = paymentBaseSchema.extend({
  applications: z.array(paymentApplicationBaseSchema).optional(),
});

export const paymentSelectSchema = createSelectSchema(payments);
export const paymentSchema = paymentInputSchema.extend({
  id: z.number().optional(),
  supplier: SupplierSchema.nullish(),
  changedBy: z.number().nullish(),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;
export type Payment = z.infer<typeof paymentSchema>;

