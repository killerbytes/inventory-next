import { ORDER_STATUS } from "@/types/definitions";
import z from "zod";
import { OrderStatusHistorySchema } from "./orderStatusHistory.schema";
import { ReturnTransactionSchema } from "./returnItem.schema";
import { SupplierSchema } from "./supplier.schema";

export const GoodReceiptLineBaseSchema = z.object({
  quantity: z.coerce.number().positive("Quantity is Required"),
  combinationId: z.coerce.number().positive("Product is Required"),
  purchasePrice: z.coerce.number().positive("Purchase Price is Required"),
  discount: z.coerce.number().nullish(),
  discountNote: z.string().nullish(),
});

export const GoodReceiptLineInputSchema = GoodReceiptLineBaseSchema.strict();
export const GoodReceiptLineSchema = GoodReceiptLineInputSchema.extend({
  id: z.number(),
  goodReceiptId: z.coerce.number(),
  totalAmount: z.coerce.number(),
  unit: z.string(),
  skuSnapshot: z.string(),
  nameSnapshot: z.string(),
  categorySnapshot: z.any(),
  variantSnapshot: z.any(),
});

export type GoodReceiptLineInput = z.infer<typeof GoodReceiptLineInputSchema>;
export type GoodReceiptLineData = z.infer<typeof GoodReceiptLineSchema>;

export const GoodReceiptBaseSchema = z.object({
  supplierId: z.coerce.number().positive("Supplier is Required"),
  receiptDate: z.coerce.date(),
  referenceNo: z.string().nonempty("Reference No is Required"),
  internalNotes: z.string().optional().nullable(),
  goodReceiptLines: z
    .array(GoodReceiptLineSchema)
    .min(1, "Product/s must be included"),
});

export const GoodReceiptInputSchema = GoodReceiptBaseSchema.strict().extend({
  goodReceiptLines: z
    .array(GoodReceiptLineInputSchema)
    .min(1, "Product/s must be included"),
});
export const GoodReceiptUpdateSchema = GoodReceiptInputSchema.partial().extend({
  cancellationReason: z.string(),
});
export const GoodReceiptSchema = GoodReceiptInputSchema.extend({
  id: z.number(),
  totalAmount: z.coerce.number(),
  status: z.nativeEnum(ORDER_STATUS),
  supplier: SupplierSchema,
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
  cancellationReason: z.string().nullable(),
  returnTransactions: z.array(ReturnTransactionSchema).default([]),
  goodReceiptStatusHistory: z.array(OrderStatusHistorySchema),
});

export type GoodReceiptInput = z.infer<typeof GoodReceiptInputSchema>;
export type GoodReceiptUpdate = z.infer<typeof GoodReceiptUpdateSchema>;
export type GoodReceiptData = z.infer<typeof GoodReceiptSchema>;

export const InvoiceGoodReceiptSchema = z.object({
  id: z.coerce.number(),
  referenceNo: z.string(),
  status: z.string(),
  receiptDate: z.union([z.string(), z.date()]),
  totalAmount: z.coerce.number(),
  totalReturnAmount: z.coerce.number().nullish(),
  supplier: z.any().optional(),
});
export type InvoiceGoodReceipt = z.infer<typeof InvoiceGoodReceiptSchema>;
