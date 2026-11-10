import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import React from "react";
import { invoiceServerService } from "@/server/services/invoiceServer.service";
import InvoiceDetailClientWidget from "@/components/widgets/InvoiceDetailClientWidget";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.MANAGE_INVOICES);
  const { id } = await params;
  let invoice: any = null;
  invoice = await invoiceServerService.get(Number(id));

  return (
    <InvoiceDetailClientWidget invoice={invoice} />
  );
}
