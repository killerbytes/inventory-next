"use client";

import { DataTable } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createColumnHelper } from "@tanstack/react-table";
import { Award } from "lucide-react";
import { useMemo } from "react";
import PageHeader from "../layout/PageHeader";
import Link from "next/link";
import ColorBadge from "../common/ColorBadge";
import { UNIT_COLOR } from "@/constants";

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
          <div className="flex items-center gap-2">
            <ColorBadge colorMap={UNIT_COLOR}>{row.original.combination.unit}</ColorBadge>
            <Link className="text-primary hover:underline" href={`/products/${row.original.combination.productId}`}>{row.original.combination.name}</Link>
          </div>
        ),
      }),
      columnHelper.accessor("transactionCount", {
        header: "Transactions",
        meta: {
          align: 'right'
        },
        cell: ({ row }) => (
          <span className=" text-xs uppercase">
            {row.original.transactionCount}
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
