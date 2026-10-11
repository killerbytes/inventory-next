import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { orderStatusHistories } from "@/server/db/schema/orderStatusHistories";
import { ORDER_STATUS } from "@/constants";
import * as z from "zod";
import { UserSchema } from "./user.schema";

export const OrderStatusHistoryBaseSchema = createInsertSchema(
  orderStatusHistories,
  {
    status: () => z.coerce.number(),
  },
).pick({
  status: true,
});

export const OrderStatusHistorySelectSchema =
  createSelectSchema(orderStatusHistories);

export const OrderStatusHistorySchema = OrderStatusHistorySelectSchema.extend({
  goodReceiptId: z.coerce.number().nullish(),
  salesOrderId: z.coerce.number().nullish(),
  status: z.nativeEnum(ORDER_STATUS),
  user: UserSchema,
});

export type OrderStatusHistoryInput = z.infer<
  typeof OrderStatusHistoryBaseSchema
>;
export type OrderStatusHistoryData = z.infer<typeof OrderStatusHistorySchema>;

