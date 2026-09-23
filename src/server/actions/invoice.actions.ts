"use server";

import { PERMISSIONS } from "@/lib/rbac";
import { InvoiceInput, InvoiceInputSchema } from "@/schemas/invoice.schema";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { invoiceServerService } from "@/server/services/invoiceServer.service";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export const createInvoiceAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_INVOICES,
  schema: InvoiceInputSchema,
  handler: async ({ user }, payload: InvoiceInput) => {
    const result = await invoiceServerService.create(payload, user.id);
    revalidatePath("/invoices");
    revalidatePath("/good-receipts");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const updateInvoiceAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_INVOICES,
  schema: InvoiceInputSchema,
  handler: async ({ user }, id: number, payload: InvoiceInput) => {
    const result = await invoiceServerService.update(id, payload);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/good-receipts");
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

export const getGoodReceiptsBySupplierAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_INVOICES,
  handler: async (_ctx, supplierId: number, params: any = {}) => {
    const result = await goodReceiptServerService.getBySupplierId(
      supplierId,
      params,
    );
    return result
      ? JSON.parse(JSON.stringify(result))
      : { data: [], meta: { total: 0, totalPages: 0, currentPage: 1 } };
  },
});
