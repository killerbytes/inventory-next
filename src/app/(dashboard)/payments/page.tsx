import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import React from "react";
import { paymentServerService } from "@/server/services/paymentServer.service";
import PaymentsClientWidget from "@/components/widgets/PaymentsClientWidget";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  let payments: any[] = [];
  const result = await paymentServerService.getAll();
  payments = result || [];

  return <PaymentsClientWidget initialPayments={JSON.parse(JSON.stringify(payments))} />;
}
