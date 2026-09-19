import React from "react";
import { reportsServerService } from "@/server/services/reportsServer.service";
import PopularProductsClientWidget from "@/components/widgets/PopularProductsClientWidget";

export const dynamic = "force-dynamic";

export default async function PopularProductsPage() {
  let products: any[] = [];
  try {
    const result = await reportsServerService.getPopularProducts();
    products = result?.data || [];
  } catch (err) {
    console.error("Error fetching popular products:", err);
    products = [];
  }

  return <PopularProductsClientWidget initialProducts={JSON.parse(JSON.stringify(products))} />;
}
