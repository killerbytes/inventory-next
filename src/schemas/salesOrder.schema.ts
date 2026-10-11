import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { salesOrders } from "@/server/db/schema/salesOrders";
import { salesOrderItems } from "@/server/db/schema/salesOrderItems";
import { MODE_OF_PAYMENT, ORDER_STATUS } from "@/constants";
import * as z from "zod";
import { CustomerSchema } from "./customer.schema";
import { InventorySchema } from "./inventory.schema";
import { OrderStatusHistorySchema } from "./orderStatusHistory.schema";
import { ProductCombinationSchema } from "./productCombination.schema";
import { ReturnTransactionSchema } from "./returnItem.schema";

export const SalesOrderItemBaseSchema = createInsertSchema(salesOrderItems, {
  combinationId: () =>
    z.coerce.number().min(1, {
      message: "Product must be selected.",
    }),
  quantity: () =>
    z.coerce.number().min(1, {
      message: "Quantity must be at least 1.",
    }),
  discount: () => z.coerce.number().nullish(),
  discountNote: () => z.string().nullish(),
}).pick({
  combinationId: true,
  quantity: true,
  discount: true,
  discountNote: true,
});

export const SalesOrderItemInputSchema = SalesOrderItemBaseSchema.strict();

export const SalesOrderItemSelectSchema = createSelectSchema(salesOrderItems);
export const SalesOrderItemSchema = SalesOrderItemSelectSchema.extend({
  totalAmount: z.coerce.number(),
  originalPrice: z.coerce.number().positive(),
  purchasePrice: z.coerce.number().optional(),
  quantity: z.coerce.number(),
  discount: z.coerce.number().nullish(),
  combination: ProductCombinationSchema,
  combinations: ProductCombinationSchema.optional(),
});

export type SalesOrderItemInput = z.infer<typeof SalesOrderItemInputSchema>;
export type SalesOrderItemData = z.infer<typeof SalesOrderItemSchema>;

export const SalesOrderBaseSchema = createInsertSchema(salesOrders, {
  salesOrderNumber: () =>
    z.string().min(2, {
      message: "Sales order number is required.",
    }),
  customerId: () =>
    z.coerce
      .number()
      .min(1, {
        message: "Customer is required.",
      })
      .positive(),
  orderDate: () => z.coerce.date(),
  modeOfPayment: () =>
    z.enum(Object.values(MODE_OF_PAYMENT) as [string, ...string[]]),
  isDelivery: () => z.boolean().nullish(),
  deliveryAddress: () => z.string().nullish(),
  deliveryInstructions: () => z.string().nullish(),
  deliveryDate: () => z.coerce.date().nullish(),
  internalNotes: () => z.string().nullish(),
  notes: () => z.string().nullish(),
  dueDate: () => z.coerce.date().nullish(),
  checkNumber: () => z.string().nullish(),
})
  .pick({
    salesOrderNumber: true,
    customerId: true,
    orderDate: true,
    modeOfPayment: true,
    isDelivery: true,
    deliveryAddress: true,
    deliveryInstructions: true,
    deliveryDate: true,
    internalNotes: true,
    notes: true,
    dueDate: true,
    checkNumber: true,
  })
  .extend({
    salesOrderItems: z.array(SalesOrderItemSchema).min(1, {
      message: "At least one product is required.",
    }),
  });

export const SalesOrderInputSchema = SalesOrderBaseSchema.omit({
  salesOrderItems: true,
})
  .strict()
  .extend({
    status: z.string(),
    salesOrderItems: z.array(SalesOrderItemInputSchema).min(1, {
      message: "At least one product is required.",
    }),
  });

export const SalesOrderUpdateSchema = SalesOrderBaseSchema.partial();

export const SalesOrderSelectSchema = createSelectSchema(salesOrders);
export const SalesOrderSchema = SalesOrderSelectSchema.extend({
  isDeliveryCompleted: z.boolean().nullish(),
  totalAmount: z.coerce.number(),
  customer: CustomerSchema,
  cancellationReason: z.string().nullish(),
  returnTransactions: z.array(ReturnTransactionSchema).default([]),
  salesOrderStatusHistory: z.array(OrderStatusHistorySchema).default([]),
  status: z.string(),
  salesOrderItems: z.array(SalesOrderItemSchema).default([]),
});

export type SalesOrderInput = z.infer<typeof SalesOrderInputSchema>;
export type SalesOrderUpdate = z.infer<typeof SalesOrderUpdateSchema>;
export type SalesOrderData = z.infer<typeof SalesOrderSchema>;

export const SalesOrderItemWithCombinationSchema =
  SalesOrderItemInputSchema.extend({
    combination: ProductCombinationSchema.partial()
      .extend({
        price: z.coerce.number().positive().nullish(),
        inventory: InventorySchema.partial(),
      })
      .nullable(),
  });

export const SalesOrderFormSchema = SalesOrderInputSchema.extend({
  salesOrderItems: z.array(SalesOrderItemWithCombinationSchema).min(1, {
    message: "At least one product is required.",
  }),
}).superRefine((data, ctx) => {
  if (data.status === ORDER_STATUS.DRAFT) {
    return;
  }

  data.salesOrderItems.forEach((item, index) => {
    if (item.combination) {
      const available = Number(item.combination.inventory?.quantity ?? 0);
      const requested = Number(item.quantity ?? 0);
      if (requested > available) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Insufficient inventory (Available: ${available})`,
          path: ["salesOrderItems", index, "quantity"],
        });
      }
    }
  });
});

export type SalesOrderItemWithCombination = z.infer<
  typeof SalesOrderItemWithCombinationSchema
>;
export type SalesOrderForm = z.infer<typeof SalesOrderFormSchema>;

