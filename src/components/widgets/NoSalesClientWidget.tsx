"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import Pager from "@/components/common/Pager";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { UNIT_COLOR } from "@/constants";
import { createColumnHelper } from "@tanstack/react-table";
import { Annoyed } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const columnHelper = createColumnHelper<any>();

interface NoSalesClientWidgetProps {
  initialProducts?: any[];
  meta?: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
}

export default function NoSalesClientWidget({
  initialProducts = [],
  meta,
}: NoSalesClientWidgetProps) {
  const { filters, setFilters } = useUrlFilters({
    page: 1,
    limit: 50,
    sort: "quantity",
    order: "DESC",
  });

  const records = initialProducts || [];

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: ({ row }) => {
          const productId = row.original.productId || row.original.id;
          const unit = row.original.unit || "PCS";
          const name = row.original.name || "N/A";

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
      columnHelper.accessor("inventory.quantity", {
        header: () => <div className="text-right">Current Stock</div>,
        cell: ({ row }) => {
          const qty = Number(
            row.original.inventory?.quantity ?? row.original.quantity ?? 0,
          );
          return <div className="text-right font-bold">{qty}</div>;
        },
      }),
      columnHelper.display({
        id: "status",
        header: "Movement Status",
        cell: () => (
          <Badge variant="destructive" className="gap-1">
            <Annoyed className="h-3 w-3" /> Dead Stock (No Sales)
          </Badge>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dead Stock & Slow Movers Report"
        description="Monitoring products with zero sales activity over recent periods."
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

