import React from "react";
import { invoiceServerService } from "@/server/services/invoiceServer.service";
import InvoiceDetailClientWidget from "@/components/widgets/InvoiceDetailClientWidget";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let invoice: any = null;
  try {
    invoice = await invoiceServerService.get(Number(id));
  } catch (err) {
    console.error("Error fetching invoice details on server:", err);
    invoice = null;
  }

  return (
    <InvoiceDetailClientWidget
      invoice={invoice ? JSON.parse(JSON.stringify(invoice)) : null}
    />
  );
}
