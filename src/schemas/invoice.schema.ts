import z from "zod";
import { GoodReceiptSchema } from "./goodReceipt.schema";

export const InvoiceLineBaseSchema = z.object({
  amount: z.coerce.number(),
  goodReceiptId: z.coerce.number(),
});

export const InvoiceLineInputSchema = InvoiceLineBaseSchema.strict();
export const InvoiceLineSchema = InvoiceLineInputSchema.extend({
  id: z.number(),
  invoiceId: z.number(),
  goodReceipt: GoodReceiptSchema,
});

export const InvoiceBaseSchema = z.object({
  supplierId: z.number(),
  invoiceNumber: z.string(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  status: z.string(),
  notes: z.string().nullish(),
});

export const InvoiceInputSchema = InvoiceBaseSchema.extend({
  invoiceLines: z.array(InvoiceLineInputSchema),
});

export const InvoiceSchema = InvoiceInputSchema.extend({
  id: z.number(),
  totalAmount: z.coerce.number(),
});

export type InvoiceLineInput = z.infer<typeof InvoiceLineInputSchema>;
export type InvoiceLineData = z.infer<typeof InvoiceLineSchema>;
export type InvoiceInput = z.infer<typeof InvoiceInputSchema>;
export type InvoiceData = z.infer<typeof InvoiceSchema>;
