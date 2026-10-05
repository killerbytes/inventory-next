"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import Pager from "@/components/common/Pager";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { formatDate } from "@/lib/utils";
import { UNIT_COLOR } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { cx } from "class-variance-authority";
import Link from "next/link";
import { useMemo } from "react";

const columnHelper = createColumnHelper<any>();

interface ReorderLevelsClientWidgetProps {
  initialData?: any[];
  meta?: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
}

export default function ReorderLevelsClientWidget({
  initialData = [],
  meta,
}: ReorderLevelsClientWidgetProps) {
  const { filters, setFilters } = useUrlFilters({
    page: 1,
    limit: 50,
    sort: "lastSoldAt",
    order: "DESC",
  });

  const records = initialData || [];

  const columns = useMemo(
    () => [
      columnHelper.accessor("combinations.name", {
        header: "Product Name",
        cell: ({ row }) => {
          const combo = row.original.combinations || {};
          const productId = combo.productId || row.original.productId;
          const unit = combo.unit || "PCS";
          const name = combo.name || row.original.name || "N/A";

          return (
            <Link
              href={productId ? `/products/${productId}` : "#"}
              className="text-primary flex items-center gap-2 font-medium hover:underline"
            >
              <ColorBadge colorMap={UNIT_COLOR}>{unit}</ColorBadge>
              <span>{name}</span>
            </Link>
          );
        },
      }),
      columnHelper.accessor("combinations.reorderLevel", {
        header: () => <div className="text-right">Reorder Level</div>,
        cell: ({ row }) => {
          const level =
            row.original.combinations?.reorderLevel ??
            row.original.reorderLevel ??
            0;
          return <div className="text-right text-muted-foreground">{level}</div>;
        },
      }),
      columnHelper.accessor("transactionCount", {
        header: () => <div className="text-right">Transactions</div>,
        cell: ({ row }) => {
          const count = Number(row.original.transactionCount || 0);
          return <div className="text-right font-medium">{count}</div>;
        },
      }),
      columnHelper.accessor("quantity", {
        header: () => <div className="text-right">Current Stock</div>,
        cell: ({ row }) => {
          const qty = Number(
            row.original.quantity ??
              row.original.combinations?.inventory?.quantity ??
              0,
          );
          return (
            <div
              className={cx("text-right font-bold", {
                "text-rose-600": qty <= 0,
                "text-amber-600": qty > 0,
              })}
            >
              {qty}
            </div>
          );
        },
      }),
      columnHelper.accessor("lastSoldAt", {
        header: () => <div className="text-right">Last Sold</div>,
        cell: ({ row }) => {
          const date = row.original.lastSoldAt;
          return (
            <div className="text-right text-muted-foreground text-xs">
              {date ? formatDate(date) : "—"}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "status",
        header: "Alert Status",
        cell: ({ row }) => {
          const qty = Number(
            row.original.quantity ??
              row.original.combinations?.inventory?.quantity ??
              0,
          );
          const isOutOfStock = qty <= 0;
          return (
            <Badge variant={isOutOfStock ? "destructive" : "secondary"}>
              {isOutOfStock ? "Out of Stock" : "Low Stock Alert"}
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
          <DataTable columns={columns} data={records} />
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <Pager
          meta={meta}
          filter={filters}
          setFilter={(action: any) => {
            const next =
              typeof action === "function" ? action(filters) : action;
            setFilters(next);
          }}
        />
      )}
    </div>
  );
}

