"use client";

import { DataTable } from "@/components/common/DataTable";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { UNIT_COLOR } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import ColorBadge from "../common/ColorBadge";

const columnHelper = createColumnHelper<any>();

interface ReorderLevelsClientWidgetProps {
  initialData?: any[];
}

export default function ReorderLevelsClientWidget({
  initialData = [],
}: ReorderLevelsClientWidgetProps) {
  const records = initialData || [];
  console.log(initialData);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: ({ row }) => (
          <Link
            href={`/products/${row.original.id}`}
            className="font-semibold text-primary hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      }),
      columnHelper.accessor("baseUnit", {
        header: "Unit",
        cell: ({ row }) => (
          <ColorBadge colorMap={UNIT_COLOR}>{row.original.baseUnit}</ColorBadge>
        ),
      }),
      columnHelper.display({
        id: "stock",
        header: () => <div className="text-right">Current Stock</div>,
        cell: ({ row }) => {
          const qty = row.original.combinations?.[0]?.inventory?.quantity || 0;
          return <div className="text-right font-bold">{Number(qty)}</div>;
        },
      }),
      columnHelper.display({
        id: "reorderLevel",
        header: () => <div className="text-right">Reorder Level</div>,
        cell: ({ row }) => {
          const level = row.original.combinations?.[0]?.reorderLevel || 10;
          return (
            <div className="text-right text-muted-foreground">{level}</div>
          );
        },
      }),
      columnHelper.display({
        id: "status",
        header: "Alert Status",
        cell: ({ row }) => {
          const qty = row.original.combinations?.[0]?.inventory?.quantity || 0;
          const level = row.original.combinations?.[0]?.reorderLevel || 10;
          const isLow = qty <= level;
          return (
            <Badge variant={isLow ? "destructive" : "default"}>
              {isLow ? "Low Stock Alert" : "Healthy Stock"}
            </Badge>
          );
        },
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reorder Levels & Low Stock Report"
        description="Monitoring product inventory thresholds to highlight low-stock and out-of-stock items."
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable columns={columns} data={records} searchKey="name" />
        </CardContent>
      </Card>
    </div>
  );
}
