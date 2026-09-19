import z from "zod";
import { paymentApplicationBaseSchema } from "./paymentApplication.schema";
import { SupplierSchema } from "./supplier.schema";

export const paymentBaseSchema = z.object({
  supplierId: z.number().optional(),
  invoiceId: z.number().optional(),
  referenceNo: z.string().nullish(),
  referenceNumber: z.string().nullish(),
  paymentDate: z.string().optional(),
  amount: z.coerce.number().nullish(),
  modeOfPayment: z.string().optional(),
  notes: z.string().nullish(),
});

export const paymentInputSchema = paymentBaseSchema.extend({
  applications: z.array(paymentApplicationBaseSchema).optional(),
});

export const paymentSchema = paymentInputSchema.extend({
  id: z.number().optional(),
  supplier: SupplierSchema.nullish(),
  changedBy: z.number().nullish(),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;
export type Payment = z.infer<typeof paymentSchema>;
