"use client";

import { DataTable } from "@/components/common/DataTable";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { STOCK_ADJUSTMENT_TYPE_COLOR, UNIT_COLOR } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import ColorBadge from "../common/ColorBadge";

const columnHelper = createColumnHelper<any>();

interface StockAdjustmentsClientWidgetProps {
  initialAdjustments?: any[];
}

export default function StockAdjustmentsClientWidget({
  initialAdjustments = [],
}: StockAdjustmentsClientWidgetProps) {
  const records = initialAdjustments || [];

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.combination?.unit, {
        id: "combination.unit",
        header: "Unit / Item",
        cell: ({ row }) => {
          const comb = row.original.combination;
          return (
            <div className="flex items-center gap-2">
              <ColorBadge colorMap={UNIT_COLOR}>{comb?.unit}</ColorBadge>
              <Link
                href={`/products/${comb?.productId || 1}`}
                className="text-primary hover:underline"
              >
                {comb?.product?.name}
              </Link>
            </div>
          );
        },
      }),
      columnHelper.accessor("reason", {
        header: "Adjustment Type",
        cell: ({ row }) => {
          return (
            <ColorBadge colorMap={STOCK_ADJUSTMENT_TYPE_COLOR}>
              {row.original.reason}
            </ColorBadge>
          );
        },
      }),
      columnHelper.accessor("systemQuantity", {
        header: () => <div className="text-right">Original Quantity</div>,
        cell: ({ row }) => {
          return (
            <div className="text-right font-mono font-bold">
              {Number(row.original.systemQuantity)}
            </div>
          );
        },
      }),
      columnHelper.accessor("newQuantity", {
        header: () => <div className="text-right">New Quantity</div>,
        cell: ({ row }) => {
          return (
            <div className="text-right font-mono font-bold">
              {Number(row.original.newQuantity)}
            </div>
          );
        },
      }),
      columnHelper.accessor("notes", {
        header: "Reason / Remarks",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground max-w-20 text-nowrap overflow-hidden text-ellipsis">
            {row.original.notes}
          </div>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: "Date Adjusted",
        meta: {
          className: "text-xs",
        },
        cell: ({ row }) =>
          row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleString()
            : "—",
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Adjustment Log"
        description="Audit ledger of manual stock adjustments, shrinkage reconciliations, and physical counts."
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={records}
            searchKey="combination.unit"
          />
        </CardContent>
      </Card>
    </div>
  );
}
