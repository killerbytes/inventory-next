import { MODE_OF_PAYMENT } from "@/types/definitions";
import * as z from "zod";
import { CustomerSchema } from "./customer.schema";
import { OrderStatusHistorySchema } from "./orderStatusHistory.schema";
import {
  ProductCombinationSchema,
  ProductCombinationUpdateSchema,
} from "./productCombination.schema";
import { ReturnTransactionSchema } from "./returnItem.schema";

export const SalesOrderItemBaseSchema = z.object({
  combinationId: z.coerce.number().min(1, {
    message: "Product must be selected.",
  }),
  quantity: z.coerce.number().min(1, {
    message: "Quantity must be at least 1.",
  }),
  discount: z.coerce.number().nullish(),
  discountNote: z.string().nullish(),
  combination: ProductCombinationSchema,
});
export const SalesOrderItemInputSchema =
  SalesOrderItemBaseSchema.strict().extend({
    combination: ProductCombinationUpdateSchema,
  });

export const SalesOrderItemSchema = SalesOrderItemBaseSchema.extend({
  id: z.number(),
  originalPrice: z.coerce.number(),
  totalAmount: z.coerce.number(),
  unit: z.string(),
  skuSnapshot: z.string(),
  nameSnapshot: z.string(),
  categorySnapshot: z.string(),
  variantSnapshot: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SalesOrderItemInput = z.infer<typeof SalesOrderItemInputSchema>;
export type SalesOrderItemData = z.infer<typeof SalesOrderItemSchema>;

export const SalesOrderBaseSchema = z.object({
  salesOrderNumber: z.string(),
  customerId: z.coerce
    .number()
    .min(1, {
      message: "Customer is required.",
    })
    .positive(),
  orderDate: z.date(),
  modeOfPayment: z.enum(
    Object.values(MODE_OF_PAYMENT) as [string, ...string[]],
  ),
  isDelivery: z.boolean().nullish(),
  deliveryAddress: z.string().nullish(),
  deliveryInstructions: z.string().nullish(),
  deliveryDate: z.date().nullish(),
  internalNotes: z.string().nullish(),
  notes: z.string().nullish(),
  dueDate: z.date().nullish(),
  checkNumber: z.string().nullish(),
  salesOrderItems: z.array(SalesOrderItemSchema).min(1, {
    message: "At least one product is required.",
  }),
});

export const SalesOrderInputSchema = SalesOrderBaseSchema.strict().extend({
  status: z.string(),
  salesOrderItems: z.array(SalesOrderItemInputSchema).min(1, {
    message: "At least one product is required.",
  }),
});

export const SalesOrderUpdateSchema = SalesOrderBaseSchema.partial();

export const SalesOrderSchema = SalesOrderBaseSchema.extend({
  id: z.number(),
  isDeliveryCompleted: z.boolean().nullish(),
  totalAmount: z.coerce.number(),
  customer: CustomerSchema,
  cancellationReason: z.string().nullish(),
  returnTransactions: z.array(ReturnTransactionSchema).default([]),
  salesOrderStatusHistory: z.array(OrderStatusHistorySchema).default([]),
  status: z.string(),
});

export type SalesOrderInput = z.infer<typeof SalesOrderInputSchema>;
export type SalesOrderUpdate = z.infer<typeof SalesOrderUpdateSchema>;
export type SalesOrderData = z.infer<typeof SalesOrderSchema>;
