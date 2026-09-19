"use server";

import { PERMISSIONS } from "@/lib/rbac";
import { paymentServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export async function createPaymentAction(data: {
  salesOrderId?: number;
  amountPaid: number;
  paymentMethod?: string;
  notes?: string;
}) {
  const result = await paymentServerService.create(data);
  revalidatePath("/sales-orders");
  if (data.salesOrderId) {
    revalidatePath(`/sales-orders/${data.salesOrderId}`);
  }
  return result ? JSON.parse(JSON.stringify(result)) : null;
}

export const createInvoicePaymentAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_PAYMENTS,
  handler: async (
    { user },
    payload: {
      supplierId: number;
      amount: number;
      paymentDate?: string | Date;
      paymentMethod?: string;
      referenceNo?: string;
      notes?: string;
      applications: { invoiceId: number; amountApplied: number }[];
    },
  ) => {
    const result = await paymentServerService.create(payload, user.id);
    revalidatePath("/invoices");
    if (payload.applications && payload.applications.length > 0) {
      for (const app of payload.applications) {
        revalidatePath(`/invoices/${app.invoiceId}`);
      }
    }
    return result ? JSON.parse(JSON.stringify(result)) : null;
  },
});

