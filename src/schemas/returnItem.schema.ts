import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { returnItems } from "@/server/db/schema/returnItems";
import { returnTransactions } from "@/server/db/schema/returnTransactions";
import { ORDER_TYPE, RETURN_TYPE } from "@/constants";
import z from "zod";
import { GoodReceiptLineBaseSchema } from "./goodReceipt.schema";
import { ProductCombinationSchema } from "./productCombination.schema";

export const ReturnItemBaseSchema = createInsertSchema(returnItems, {
  combinationId: () => z.coerce.number().positive(),
  quantity: () => z.coerce.number().positive(),
  returnTransactionId: () => z.coerce.number(),
  unitPrice: () => z.coerce.number(),
  totalAmount: () => z.coerce.number(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const ReturnItemSelectSchema = createSelectSchema(returnItems);
export const ReturnItemSchema = ReturnItemSelectSchema.extend({
  quantity: z.coerce.number(),
  unitPrice: z.coerce.number(),
  totalAmount: z.coerce.number(),
  combination: ProductCombinationSchema,
});

export const ReturnTransactionBaseSchema = createInsertSchema(
  returnTransactions,
  {
    referenceId: () => z.number(),
    sourceType: () => z.nativeEnum(ORDER_TYPE),
    totalReturnAmount: () => z.coerce.number(),
    totalExchangeAmount: () => z.coerce.number().nullish(),
    paymentDifference: () => z.coerce.number(),
    type: () => z.nativeEnum(RETURN_TYPE),
  },
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const ReturnTransactionSelectSchema =
  createSelectSchema(returnTransactions);

export const ReturnTransactionSchema = ReturnTransactionSelectSchema.extend({
  sourceType: z.nativeEnum(ORDER_TYPE),
  totalReturnAmount: z.coerce.number(),
  totalExchangeAmount: z.coerce.number().nullish(),
  paymentDifference: z.coerce.number(),
  type: z.nativeEnum(RETURN_TYPE),
  returnItems: z.array(ReturnItemSchema),
});

export const ExchangeItemLineSchema = z.object({
  combinationId: z.coerce.number().positive(),
  name: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  price: z.coerce.number().nonnegative(),
});
export type ExchangeItemLineData = z.infer<typeof ExchangeItemLineSchema>;

export const ReturnExchangeFormSchema = z.object({
  referenceId: z.coerce.number().positive(),
  returns: z
    .array(z.lazy(() => GoodReceiptLineBaseSchema))
    .min(1, "At least one return item is required"),
  exchanges: z.array(ExchangeItemLineSchema).optional().nullable(),
  reason: z.string().min(1, "Reason is required"),
});
export type ReturnItemData = z.infer<typeof ReturnItemSchema>;
export type ReturnTransactionData = z.infer<typeof ReturnTransactionSchema>;
export type ReturnExchangeFormInput = z.infer<typeof ReturnExchangeFormSchema>;

