"use server";

import { PERMISSIONS } from "@/lib/rbac";
import { paymentServerService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { createProtectedAction } from "./safeAction";

export const createInvoicePaymentAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_PAYMENTS,
  handler: async ({ user }, payload: any) => {
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
