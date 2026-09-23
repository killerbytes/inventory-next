"use server";

import { PERMISSIONS } from "@/lib/rbac";
import { SalesOrderInputSchema } from "@/schemas/salesOrder.schema";
import { salesServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export const createSalesOrderAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SALES,
  schema: SalesOrderInputSchema,
  handler: async ({ user }, data: any) => {
    const result = await salesServerService.create(data, user.id);
    revalidatePath("/sales-orders");
    revalidatePath("/inventory");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const cancelSalesOrderAction = createProtectedAction({
  permission: PERMISSIONS.CANCEL_SALES,
  handler: async ({ user }, id: number, reason?: string) => {
    const result = await salesServerService.cancelOrder(id, reason, user.id);
    revalidatePath("/sales-orders");
    revalidatePath(`/sales-orders/${id}`);
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const returnExchangeAction = createProtectedAction({
  permission: PERMISSIONS.RETURN_EXCHANGE_SALES,
  handler: async (
    _ctx,
    id: number,
    data: {
      returns?: { combinationId: number; quantity: number }[];
      exchanges?: { combinationId: number; quantity: number }[];
      reason?: string;
    },
  ) => {
    const result = await salesServerService.returnExchange(
      id,
      data.returns || [],
      data.exchanges || [],
      data.reason || "Customer Return/Exchange",
    );
    revalidatePath("/sales-orders");
    revalidatePath(`/sales-orders/${id}`);
    revalidatePath("/inventory");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});
