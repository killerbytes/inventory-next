import { ORDER_STATUS } from "@/types/definitions";
import * as z from "zod";

export const OrderStatusHistoryBaseSchema = z.object({
  status: z.coerce.number(),
});

export const OrderStatusHistorySchema = OrderStatusHistoryBaseSchema.extend({
  id: z.number(),
  goodReceiptId: z.coerce.number().nullish(),
  salesOrderId: z.coerce.number().nullish(),
  status: z.nativeEnum(ORDER_STATUS),
  changedBy: z.number(),
});

export type OrderStatusHistoryInput = z.infer<
  typeof OrderStatusHistoryBaseSchema
>;
export type OrderStatusHistoryData = z.infer<typeof OrderStatusHistorySchema>;
