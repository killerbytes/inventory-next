"use server";

import { PERMISSIONS } from "@/lib/rbac";
import {
  SupplierInput,
  SupplierInputSchema,
  SupplierUpdateInput,
  SupplierUpdateSchema,
} from "@/schemas";
import { supplierServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export const createSupplierAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SUPPLIERS,
  schema: SupplierInputSchema,
  handler: async (_ctx, data: SupplierInput) => {
    const result = await supplierServerService.create(data);
    revalidatePath("/suppliers");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateSupplierAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SUPPLIERS,
  schema: SupplierUpdateSchema,
  handler: async (_ctx, id: number, data: SupplierUpdateInput) => {
    const result = await supplierServerService.update(id, data);
    revalidatePath("/suppliers");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const deleteSupplierAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SUPPLIERS,
  handler: async (_ctx, id: number) => {
    const result = await supplierServerService.delete(id);
    revalidatePath("/suppliers");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const getSuppliersAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SUPPLIERS,
  handler: async () => {
    const result = await supplierServerService.getAll();
    return result ? JSON.parse(JSON.stringify(result)) : [];
  },
});
