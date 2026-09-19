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
    console.log(454, data);

    const result = await goodReceiptServerService.update(id, data, user.id);
    revalidatePath("/good-receipts");
    revalidatePath(`/good-receipts/${id}`);
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export async function cancelGoodReceiptAction(id: number) {
  const result = await goodReceiptServerService.cancelOrder(id);
  revalidatePath("/good-receipts");
  revalidatePath(`/good-receipts/${id}`);
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function deleteGoodReceiptAction(id: number) {
  const result = await goodReceiptServerService.delete(id);
  revalidatePath("/good-receipts");
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export async function supplierReturnsAction(
  id: number,
  data: {
    returns: GoodReceiptLineData[];
    reason?: string;
  },
) {
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
}
