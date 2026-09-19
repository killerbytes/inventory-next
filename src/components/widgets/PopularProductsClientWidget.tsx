"use client";

import { DataTable } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createColumnHelper } from "@tanstack/react-table";
import { Award } from "lucide-react";
import { useMemo } from "react";
import PageHeader from "../layout/PageHeader";

const columnHelper = createColumnHelper<any>();

interface PopularProductsClientWidgetProps {
  initialProducts: any[];
}

export default function PopularProductsClientWidget({
  initialProducts,
}: PopularProductsClientWidgetProps) {
  const products = initialProducts || [];

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "rank",
        header: "Rank",
        cell: ({ row }) => (
          <div className="font-bold text-primary flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />#{row.index + 1}
          </div>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.name}</span>
        ),
      }),
      columnHelper.accessor("sku", {
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.sku || "N/A"}</span>
        ),
      }),
      columnHelper.accessor("baseUnit", {
        header: "Base Unit",
        cell: ({ row }) => (
          <span className="font-mono text-xs uppercase">
            {row.original.baseUnit || "PCS"}
          </span>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Popular Products"
        description="Top-selling product combinations ranked by sales volume and total generated revenue."
      />

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Items</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={products} searchKey="name" />
        </CardContent>
      </Card>
    </div>
  );
}
