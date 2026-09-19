import { ORDER_TYPE, RETURN_TYPE } from "@/types/definitions";
import z from "zod";
import { GoodReceiptLineSchema } from "./goodReceipt.schema";
import { ProductCombinationSchema } from "./productCombination.schema";

export const ReturnItemBaseSchema = z.object({
  combinationId: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
  returnTransactionId: z.coerce.number(),
  unitPrice: z.coerce.number(),
  totalAmount: z.coerce.number(),
  reason: z.string().nullish(),
  type: z.string(),
});

export const ReturnItemSchema = ReturnItemBaseSchema.extend({
  id: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  combination: ProductCombinationSchema,
});

export const ReturnTransactionBaseSchema = z.object({
  referenceId: z.number(),
  sourceType: z.nativeEnum(ORDER_TYPE),
  totalReturnAmount: z.coerce.number(),
  totalExchangeAmount: z.coerce.number().nullish(),
  paymentDifference: z.coerce.number(),
  type: z.nativeEnum(RETURN_TYPE),
});

export const ReturnTransactionSchema = ReturnTransactionBaseSchema.extend({
  id: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  returnItems: z.array(ReturnItemSchema),
});

export const ReturnExchangeFormSchema = z.object({
  referenceId: z.coerce.number().positive(),
  returns: z
    .array(z.lazy(() => GoodReceiptLineSchema))
    .min(1, "At least one return item is required"),
  reason: z.string().min(1, "Reason is required"),
});
export type ReturnItemData = z.infer<typeof ReturnItemSchema>;
export type ReturnTransactionData = z.infer<typeof ReturnTransactionSchema>;
export type ReturnExchangeFormInput = z.infer<typeof ReturnExchangeFormSchema>;
