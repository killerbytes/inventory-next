import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import ProfitClientWidget from "@/components/widgets/ProfitClientWidget";

export const dynamic = "force-dynamic";

export default async function ProfitReportPage() {
  let summary = {
    totalSales: 0,
    estimatedCost: 0,
    netProfit: 0,
    marginPercentage: "0.0",
  };
  try {
    summary = await reportsServerService.getProfitSummary();
  } catch (err) {
    console.error("Error fetching profit summary:", err);
  }

  return <ProfitClientWidget initialSummary={summary} />;
}
