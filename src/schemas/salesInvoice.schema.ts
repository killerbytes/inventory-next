import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { salesInvoices, salesInvoiceLines } from "@/server/db/schema/salesInvoices";
import { CustomerSchema } from "./customer.schema";
import { SalesOrderSchema } from "./salesOrder.schema";
import { INVOICE_STATUS } from "@/constants";
import * as z from "zod";

export const DEFAULT_STATEMENT_NOTES = `Acct. Name: Jeffrey Bulanadi\nAcct. No: 0104-4801-0027\nBank Name: BDO Unibank`;

export interface RawStatementLine {
  salesOrderId: number;
  orderDate?: Date | string | null;
  refNo?: string | null;
  description?: string | null;
  charges?: number | string | null;
  payments?: number | string | null;
  balance?: number | string | null;
}

export function calculateStatementBalances(
  lines: RawStatementLine[],
  previousBalance: number = 0,
) {
  let runningBalance = Number(previousBalance || 0);
  let totalCharges = 0;
  let totalPayments = 0;

  const computedLines = lines.map((line) => {
    const charge = Number(line.charges || 0);
    const payment = Number(line.payments || 0);
    runningBalance = Math.round((runningBalance + charge - payment) * 100) / 100;
    totalCharges = Math.round((totalCharges + charge) * 100) / 100;
    totalPayments = Math.round((totalPayments + payment) * 100) / 100;

    return {
      ...line,
      charges: charge,
      payments: payment,
      balance: runningBalance,
    };
  });

  const amountDue = Math.round((Number(previousBalance || 0) + totalCharges - totalPayments) * 100) / 100;

  return {
    lines: computedLines,
    previousBalance: Number(previousBalance || 0),
    totalCharges,
    totalPayments,
    amountDue,
  };
}

export const SalesInvoiceLineBaseSchema = createInsertSchema(salesInvoiceLines, {
  salesOrderId: () => z.coerce.number().min(1, { message: "Sales order reference is required." }),
  orderDate: () => z.coerce.date().nullish(),
  refNo: () => z.string().nullish(),
  description: () => z.string().nullish(),
  charges: () => z.coerce.number().min(0).default(0),
  payments: () => z.coerce.number().min(0).default(0),
  balance: () => z.coerce.number().default(0),
}).pick({
  salesOrderId: true,
  orderDate: true,
  refNo: true,
  description: true,
  charges: true,
  payments: true,
  balance: true,
});

export const SalesInvoiceLineInputSchema = SalesInvoiceLineBaseSchema.extend({
  id: z.coerce.number().optional(),
});

export const SalesInvoiceLineSelectSchema = createSelectSchema(salesInvoiceLines);
export const SalesInvoiceLineSchema = SalesInvoiceLineSelectSchema.extend({
  charges: z.coerce.number(),
  payments: z.coerce.number(),
  balance: z.coerce.number(),
  salesOrder: SalesOrderSchema.optional(),
});

export const SalesInvoiceBaseSchema = createInsertSchema(salesInvoices, {
  customerId: () => z.coerce.number().min(1, { message: "Customer is required." }),
  invoiceNumber: () => z.string().nullish(),
  invoiceDate: () => z.coerce.date(),
  dueDate: () => z.coerce.date().nullish(),
  status: () => z.string().default(INVOICE_STATUS.DRAFT),
  previousBalance: () => z.coerce.number().default(0),
  totalCharges: () => z.coerce.number().min(0).default(0),
  totalPayments: () => z.coerce.number().min(0).default(0),
  amountDue: () => z.coerce.number().default(0),
  notes: () => z.string().nullish(),
}).pick({
  customerId: true,
  invoiceNumber: true,
  invoiceDate: true,
  dueDate: true,
  status: true,
  previousBalance: true,
  totalCharges: true,
  totalPayments: true,
  amountDue: true,
  notes: true,
});

export const SalesInvoiceInputSchema = SalesInvoiceBaseSchema.extend({
  salesInvoiceLines: z.array(SalesInvoiceLineInputSchema).min(1, { message: "At least one sales order line is required." }),
});

export const SalesInvoiceSelectSchema = createSelectSchema(salesInvoices);
export const SalesInvoiceSchema = SalesInvoiceSelectSchema.extend({
  previousBalance: z.coerce.number(),
  totalCharges: z.coerce.number(),
  totalPayments: z.coerce.number(),
  amountDue: z.coerce.number(),
  customer: CustomerSchema.optional(),
  salesInvoiceLines: z.array(SalesInvoiceLineSchema).optional(),
});

export type SalesInvoiceLineInput = z.infer<typeof SalesInvoiceLineInputSchema>;
export type SalesInvoiceLineData = z.infer<typeof SalesInvoiceLineSchema>;
export type SalesInvoiceInput = z.infer<typeof SalesInvoiceInputSchema>;
export type SalesInvoiceData = z.infer<typeof SalesInvoiceSchema>;
