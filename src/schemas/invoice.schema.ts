import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { invoices, invoiceLines } from "@/server/db/schema/invoices";
import z from "zod";
import { GoodReceiptSchema } from "./goodReceipt.schema";

export const InvoiceLineBaseSchema = createInsertSchema(invoiceLines, {
  amount: () => z.coerce.number(),
})
  .pick({
    amount: true,
  })
  .extend({
    goodReceiptId: z.coerce.number(),
  });

export const InvoiceLineInputSchema = InvoiceLineBaseSchema.strict();

export const InvoiceLineSelectSchema = createSelectSchema(invoiceLines);
export const InvoiceLineSchema = InvoiceLineSelectSchema.extend({
  invoiceId: z.number(),
  goodReceiptId: z.coerce.number(),
  amount: z.coerce.number(),
  goodReceipt: GoodReceiptSchema,
});

export const InvoiceBaseSchema = createInsertSchema(invoices, {
  supplierId: () => z.number(),
  invoiceNumber: () => z.string(),
  invoiceDate: () => z.coerce.date(),
  dueDate: () => z.coerce.date(),
  status: () => z.string(),
  notes: () => z.string().nullish(),
}).pick({
  supplierId: true,
  invoiceNumber: true,
  invoiceDate: true,
  dueDate: true,
  status: true,
  notes: true,
});

export const InvoiceInputSchema = InvoiceBaseSchema.extend({
  invoiceLines: z.array(InvoiceLineInputSchema),
});

export const InvoiceSelectSchema = createSelectSchema(invoices);
export const InvoiceSchema = InvoiceSelectSchema.extend({
  totalAmount: z.coerce.number(),
  invoiceLines: z.array(InvoiceLineSchema),
});

export type InvoiceLineInput = z.infer<typeof InvoiceLineInputSchema>;
export type InvoiceLineData = z.infer<typeof InvoiceLineSchema>;
export type InvoiceInput = z.infer<typeof InvoiceInputSchema>;
export type InvoiceData = z.infer<typeof InvoiceSchema>;

