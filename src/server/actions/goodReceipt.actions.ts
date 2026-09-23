"use server";

import { PERMISSIONS } from "@/lib/rbac";
import {
  GoodReceiptInput,
  GoodReceiptInputSchema,
  GoodReceiptLineData,
  ReturnExchangeFormSchema,
} from "@/schemas";
import { goodReceiptServerService } from "@/server/services";
import { ORDER_STATUS } from "@/types/definitions";
import { revalidatePath } from "next/cache";
import z from "zod";
import { createProtectedAction } from "./safeAction";

export const createGoodReceiptAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_GOODS,
  schema: GoodReceiptInputSchema,
  handler: async ({ user }, payload: GoodReceiptInput) => {
    const result = await goodReceiptServerService.create(payload, user.id);
    revalidatePath("/good-receipts");
    revalidatePath("/inventory");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateGoodReceiptAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_GOODS,
  schema: z.object({
    status: z.nativeEnum(ORDER_STATUS),
  }),
  handler: async ({ user }, id: number, data: any) => {
    const result = await goodReceiptServerService.update(id, data, user.id);
    revalidatePath("/good-receipts");
    revalidatePath(`/good-receipts/${id}`);
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const cancelGoodReceiptAction = createProtectedAction({
  permission: PERMISSIONS.CANCEL_GOODS,
  handler: async (_ctx, id: number) => {
    const result = await goodReceiptServerService.cancelOrder(id);
    revalidatePath("/good-receipts");
    revalidatePath(`/good-receipts/${id}`);
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const deleteGoodReceiptAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_GOODS,
  handler: async ({ user }, id: number) => {
    const result = await goodReceiptServerService.delete(id, user.id);
    revalidatePath("/good-receipts");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const supplierReturnsAction = createProtectedAction({
  permission: PERMISSIONS.RETURN_GOODS,
  handler: async (
    _ctx,
    id: number,
    data: {
      returns: GoodReceiptLineData[];
      reason?: string;
    },
  ) => {
    const validated = ReturnExchangeFormSchema.parse({
      referenceId: id,
      returns: data.returns,
      reason: data.reason || "Supplier Return",
    });

    const result = await goodReceiptServerService.supplierReturns(
      validated.referenceId,
      validated.returns,
      validated.reason,
    );
    revalidatePath("/good-receipts");
    revalidatePath(`/good-receipts/${id}`);
    revalidatePath("/inventory");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});
