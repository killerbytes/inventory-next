"use server";

import { PERMISSIONS } from "@/lib/rbac";
import {
  CustomerInput,
  CustomerInputSchema,
  CustomerUpdateInput,
  CustomerUpdateSchema,
} from "@/schemas";
import { customerServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export const createCustomerAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_CUSTOMERS,
  schema: CustomerInputSchema,
  handler: async (_ctx, data: CustomerInput) => {
    const result = await customerServerService.create(data);
    revalidatePath("/customers");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateCustomerAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_CUSTOMERS,
  schema: CustomerUpdateSchema,
  handler: async (_ctx, id: number, data: CustomerUpdateInput) => {
    const result = await customerServerService.update(id, data);
    revalidatePath("/customers");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const deleteCustomerAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_CUSTOMERS,
  handler: async (_ctx, id: number) => {
    const result = await customerServerService.delete(id);
    revalidatePath("/customers");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});
