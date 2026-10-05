"use client";

import { DataTable } from "@/components/common/DataTable";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import ColorBadge from "../common/ColorBadge";
import { UNIT_COLOR } from "@/types/definitions";

const columnHelper = createColumnHelper<any>();

interface BreakPacksWidgetProps {
  initialBreakPacks?: any[];
}

export default function BreakPacksWidget({
  initialBreakPacks = [],
}: BreakPacksWidgetProps) {
  const records = initialBreakPacks || [];

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.fromCombination?.unit, {
        id: "fromCombination.unit",
        header: "From (Source Unit)",
        cell: ({ row }) => {
          const from = row.original.fromCombination;
          return (
            <div className="flex items-center gap-2 font-semibold">
              <ColorBadge colorMap={UNIT_COLOR}>
                {from?.unit}
              </ColorBadge>
              <Link
                href={`/products/${from?.productId}`}
                className="text-primary hover:underline"
              >
                {from?.product?.name}
              </Link>
            </div>
          );
        },
      }),
      columnHelper.accessor((row) => row.toCombination?.unit, {
        id: "toCombination.unit",
        header: "To (Target Unit)",
        cell: ({ row }) => {
          const to = row.original.toCombination;
          return (
            <div className="flex items-center gap-2">
              <ColorBadge colorMap={UNIT_COLOR}>
                {to?.unit}
              </ColorBadge>
              <span>
                {to?.product?.name}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("quantity", {
        header: () => <div className="text-right">Quantity</div>,
        cell: ({ row }) => (
          <div className="text-right  font-bold">
            {Number(row.original.quantity)}
          </div>
        ),
      }),
      columnHelper.accessor("conversionFactor", {
        header: () => <div className="text-right">Conversion Factor</div>,
        cell: ({ row }) => (
          <div className="text-right  text-xs text-muted-foreground">
            {Number(row.original.conversionFactor)}
          </div>
        ),
      }),
      columnHelper.display({
        id: "total",
        header: () => <div className="text-right">Total Converted</div>,
        cell: ({ row }) => {
          const qty = Number(row.original.quantity);
          const factor = Number(row.original.conversionFactor);
          return (
            <div className="text-right  font-bold text-emerald-600">
              {qty * factor}
            </div>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Date Created",
        cell: ({ row }) => {
          console.log(row.original);
          if (!row.original.createdAt) {
            return ""
          }

          return new Date(row.original.createdAt).toLocaleString()
        }

      }),
      columnHelper.accessor((row) => row.user?.username, {
        id: "user.username",
        header: "User",
        cell: ({ row }) => (
          <span className=" text-xs text-muted-foreground">
            {row.original.user?.username}
          </span>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Break Packs Audit Journal"
        description="Audit history of bulk wholesale package conversions into retail unit pieces."
      />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={records}
            searchKey="fromCombination.unit"
          />
        </CardContent>
      </Card>
    </div>
  );
}
