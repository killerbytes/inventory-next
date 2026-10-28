"use server";

import { PERMISSIONS } from "@/lib/rbac";
import {
  SalesInvoiceInput,
  SalesInvoiceInputSchema,
} from "@/schemas/salesInvoice.schema";
import { salesInvoiceServerService } from "@/server/services/salesInvoiceServer.service";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export const getSalesInvoicesAction = createProtectedAction({
  permission: PERMISSIONS.VIEW_SALES,
  handler: async (_ctx, params: any = {}) => {
    const result = await salesInvoiceServerService.getAll(params);
    return result ? JSON.parse(JSON.stringify(result)) : { data: [], meta: { total: 0, totalPages: 0, currentPage: 1 } };
  },
});

export const getSalesInvoiceAction = createProtectedAction({
  permission: PERMISSIONS.VIEW_SALES,
  handler: async (_ctx, id: number) => {
    const result = await salesInvoiceServerService.get(id);
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const createSalesInvoiceAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SALES,
  schema: SalesInvoiceInputSchema,
  handler: async ({ user }, payload: SalesInvoiceInput) => {
    const result = await salesInvoiceServerService.create(payload, user.id);
    revalidatePath("/sales-invoices");
    revalidatePath("/sales-orders");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateSalesInvoiceAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SALES,
  schema: SalesInvoiceInputSchema,
  handler: async ({ user }, id: number, payload: SalesInvoiceInput) => {
    const result = await salesInvoiceServerService.update(id, payload, user.id);
    revalidatePath("/sales-invoices");
    revalidatePath(`/sales-invoices/${id}`);
    revalidatePath("/sales-orders");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const postSalesInvoiceAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SALES,
  handler: async ({ user }, id: number) => {
    const result = await salesInvoiceServerService.postInvoice(id, user.id);
    revalidatePath("/sales-invoices");
    revalidatePath(`/sales-invoices/${id}`);
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const voidSalesInvoiceAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SALES,
  handler: async ({ user }, id: number) => {
    const result = await salesInvoiceServerService.voidInvoice(id, user.id);
    revalidatePath("/sales-invoices");
    revalidatePath(`/sales-invoices/${id}`);
    revalidatePath("/sales-orders");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const deleteSalesInvoiceAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SALES,
  handler: async ({ user }, id: number) => {
    const result = await salesInvoiceServerService.delete(id, user.id);
    revalidatePath("/sales-invoices");
    revalidatePath("/sales-orders");
    return result;
  },
});

export const getUninvoicedSalesOrdersAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SALES,
  handler: async (_ctx, customerId: number) => {
    const result = await salesInvoiceServerService.getUninvoicedSalesOrders(customerId);
    return result ? JSON.parse(JSON.stringify(result)) : [];
  },
});
