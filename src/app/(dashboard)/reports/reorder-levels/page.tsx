import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import ReorderLevelsClientWidget from "@/components/widgets/ReorderLevelsClientWidget";

export const dynamic = "force-dynamic";

export default async function ReorderLevelsPage() {
  let products: any[] = [];
  try {
    const result = await reportsServerService.getReorderLevels();
    products = result || [];
  } catch (err) {
    console.error("Error fetching reorder levels:", err);
    products = [];
  }

  return <ReorderLevelsClientWidget initialData={JSON.parse(JSON.stringify(products))} />;
}
