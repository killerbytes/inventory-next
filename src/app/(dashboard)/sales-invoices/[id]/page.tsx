import React from "react";
import { salesInvoiceServerService } from "@/server/services/salesInvoiceServer.service";
import SalesInvoiceDetailClientWidget from "@/components/widgets/SalesInvoiceDetailClientWidget";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SalesInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let invoice: any = null;
  try {
    invoice = await salesInvoiceServerService.get(Number(id));
  } catch (err) {
    console.error("Error fetching sales invoice details on server:", err);
    invoice = null;
  }

  if (!invoice) {
    notFound();
  }

  return (
    <SalesInvoiceDetailClientWidget invoice={JSON.parse(JSON.stringify(invoice))} />
  );
}
