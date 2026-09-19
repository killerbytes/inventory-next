import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import NoSalesClientWidget from "@/components/widgets/NoSalesClientWidget";

export const dynamic = "force-dynamic";

export default async function NoSalesPage() {
  let products: any[] = [];
  try {
    const result = await reportsServerService.getNoSales();
    products = result || [];
  } catch (err) {
    console.error("Error fetching no sales report:", err);
    products = [];
  }

  return <NoSalesClientWidget initialProducts={JSON.parse(JSON.stringify(products))} />;
}
