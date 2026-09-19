import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import BreakPacksWidget from "@/components/widgets/BreakPacksWidget";

export const dynamic = "force-dynamic";

export default async function BreakPacksPage() {
  let records: any[] = [];
  try {
    records = await reportsServerService.getBreakPacks();
  } catch (err) {
    console.error("Error fetching break packs on server:", err);
    records = [];
  }

  return <BreakPacksWidget initialBreakPacks={JSON.parse(JSON.stringify(records))} />;
}
