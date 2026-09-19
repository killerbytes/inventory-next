"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { UNIT_COLOR } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";

const columnHelper = createColumnHelper<any>();

interface LowStockProps {
  items?: any[];
}

export default function LowStock({ items = [] }: LowStockProps) {
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "name",
        header: "Name",
        cell: ({ row }) => {
          const combo = row.original.combinations || row.original;
          const productId = combo.productId || row.original.productId;
          const unit = combo.unit || "PCS";
          const name = combo.name || row.original.name;

          return (
            <Link
              href={`/products/${productId}`}
              className="flex items-center gap-2 hover:underline text-primary text-sm font-medium"
            >
              <ColorBadge colorMap={UNIT_COLOR}>{unit}</ColorBadge>
              <span>{name}</span>
            </Link>
          );
        },
      }),
      columnHelper.display({
        id: "quantity",
        header: () => <div className="text-right">Quantity</div>,
        cell: ({ row }) => {
          const qty = Number(
            row.original.quantity ??
              row.original.inventory?.quantity ??
              row.original.combinations?.inventory?.quantity ??
              0,
          );
          return (
            <div
              className={`text-right font-mono text-xs ${
                qty <= 0 ? "font-bold text-rose-600" : "font-semibold"
              }`}
            >
              {qty}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "date",
        header: () => <div className="text-right">Date</div>,
        cell: ({ row }) => {
          const date = row.original.lastSoldAt;
          return (
            <div className="text-right text-xs text-muted-foreground">
              {date ? formatDate(date) : "—"}
            </div>
          );
        },
      }),
    ],
    [],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Low Stock</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={items}
          paginate={false}
          meta={{ disabledRow: { isActive: false } }}
        />
      </CardContent>
    </Card>
  );
}
