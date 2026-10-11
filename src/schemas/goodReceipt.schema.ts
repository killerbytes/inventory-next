import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { goodReceipts } from "@/server/db/schema/goodReceipts";
import { goodReceiptLines } from "@/server/db/schema/goodReceiptLines";
import { ORDER_STATUS } from "@/constants";
import z from "zod";
import { OrderStatusHistorySchema } from "./orderStatusHistory.schema";
import { ProductCombinationSchema } from "./productCombination.schema";
import { ReturnTransactionSchema } from "./returnItem.schema";
import { SupplierSchema } from "./supplier.schema";
import { InventorySchema } from "./inventory.schema";

export const GoodReceiptLineBaseSchema = createInsertSchema(
  goodReceiptLines,
  {
    quantity: () => z.coerce.number().positive("Quantity is Required"),
    combinationId: () => z.coerce.number().positive("Product is Required"),
    purchasePrice: () =>
      z.coerce.number().positive("Purchase Price is Required"),
    discount: () => z.coerce.number().nullish(),
    discountNote: () => z.string().nullish(),
  },
).pick({
  quantity: true,
  combinationId: true,
  purchasePrice: true,
  discount: true,
  discountNote: true,
});

export const GoodReceiptLineInputSchema = GoodReceiptLineBaseSchema.strict();

export const GoodReceiptLineSelectSchema = createSelectSchema(goodReceiptLines);
export const GoodReceiptLineSchema = GoodReceiptLineSelectSchema.extend({
  goodReceiptId: z.coerce.number(),
  totalAmount: z.coerce.number(),
  purchasePrice: z.coerce.number(),
  quantity: z.coerce.number(),
  unit: z.string(),
  skuSnapshot: z.string(),
  nameSnapshot: z.string(),
  categorySnapshot: z.any(),
  variantSnapshot: z.any(),
});

export type GoodReceiptLineInput = z.infer<typeof GoodReceiptLineInputSchema>;
export type GoodReceiptLineData = z.infer<typeof GoodReceiptLineSchema>;

export const GoodReceiptBaseSchema = createInsertSchema(goodReceipts, {
  supplierId: () => z.coerce.number().positive("Supplier is Required"),
  receiptDate: () => z.coerce.date(),
  referenceNo: () => z.string().nonempty("Reference No is Required"),
  internalNotes: () => z.string().optional().nullable(),
})
  .pick({
    supplierId: true,
    receiptDate: true,
    referenceNo: true,
    internalNotes: true,
  })
  .extend({
    goodReceiptLines: z
      .array(GoodReceiptLineSchema)
      .min(1, "Product/s must be included"),
  });

export const GoodReceiptInputSchema = GoodReceiptBaseSchema.omit({
  goodReceiptLines: true,
})
  .strict()
  .extend({
    goodReceiptLines: z
      .array(GoodReceiptLineInputSchema)
      .min(1, "Product/s must be included"),
  });

export const GoodReceiptLineUpdateSchema = GoodReceiptLineBaseSchema.extend({
  id: z.number().optional(),
});

export const GoodReceiptUpdateSchema = z.object({
  supplierId: z.coerce.number().positive().optional(),
  receiptDate: z.coerce.date().optional(),
  referenceNo: z.string().optional(),
  internalNotes: z.string().nullish(),
  status: z.nativeEnum(ORDER_STATUS).optional(),
  cancellationReason: z.string().nullish(),
  goodReceiptLines: z.array(GoodReceiptLineUpdateSchema).optional(),
});

const GoodReceiptLineWithCombination = GoodReceiptLineInputSchema.extend({
  id: z.number().optional(),
  goodReceiptId: z.coerce.number().optional(),
  totalAmount: z.coerce.number().optional(),
  unit: z.string().optional(),
  skuSnapshot: z.string().optional(),
  nameSnapshot: z.string().optional(),
  categorySnapshot: z.any().optional(),
  variantSnapshot: z.any().optional(),
  combination: ProductCombinationSchema.partial().extend({
    inventory: InventorySchema.partial().nullish(),
  }).nullable(),
});

export const GoodReceiptSelectSchema = createSelectSchema(goodReceipts);
export const GoodReceiptSchema = GoodReceiptSelectSchema.extend({
  totalAmount: z.coerce.number(),
  status: z.nativeEnum(ORDER_STATUS),
  supplier: SupplierSchema,
  cancellationReason: z.string().nullable(),
  returnTransactions: z.array(ReturnTransactionSchema).default([]),
  goodReceiptStatusHistory: z.array(OrderStatusHistorySchema),
  goodReceiptLines: z
    .array(GoodReceiptLineWithCombination)
    .min(1, "Product/s must be included"),
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

export const GoodReceiptFormSchema = GoodReceiptInputSchema.extend({
  goodReceiptLines: z.array(GoodReceiptLineWithCombination),
});

export type GoodReceiptLineWithCombination = z.infer<
  typeof GoodReceiptLineWithCombination
>;
export type GoodReceiptModalForm = z.infer<typeof GoodReceiptFormSchema>;

