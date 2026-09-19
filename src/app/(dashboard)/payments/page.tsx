import React from "react";
import { paymentServerService } from "@/server/services/paymentServer.service";
import PaymentsClientWidget from "@/components/widgets/PaymentsClientWidget";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  let payments: any[] = [];
  try {
    const result = await paymentServerService.getAll();
    payments = result || [];
  } catch (err) {
    console.error("Error fetching payments on server:", err);
    payments = [];
  }

  return <PaymentsClientWidget initialPayments={JSON.parse(JSON.stringify(payments))} />;
}
