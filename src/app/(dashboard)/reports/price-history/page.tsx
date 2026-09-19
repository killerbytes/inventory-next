import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import PriceHistoryClientWidget from "@/components/widgets/PriceHistoryClientWidget";

export const dynamic = "force-dynamic";

export default async function PriceHistoryPage() {
  let logs: any[] = [];
  try {
    const result = await reportsServerService.getPriceHistory();
    logs = result || [];
  } catch (err) {
    console.error("Error fetching price history logs:", err);
    logs = [];
  }

  return <PriceHistoryClientWidget initialLogs={JSON.parse(JSON.stringify(logs))} />;
}
