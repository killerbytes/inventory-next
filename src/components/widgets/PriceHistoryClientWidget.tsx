"use client";

import { DataTable } from "@/components/common/DataTable";
import Pager from "@/components/common/Pager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { createColumnHelper } from "@tanstack/react-table";
import { ChartCandlestick, Search } from "lucide-react";
import { useMemo } from "react";
import PageHeader from "../layout/PageHeader";

const columnHelper = createColumnHelper<any>();

interface PriceHistoryClientWidgetProps {
  initialLogs: any[];
  meta?: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
}

export default function PriceHistoryClientWidget({
  initialLogs,
  meta,
}: PriceHistoryClientWidgetProps) {
  const { filters, setFilters } = useUrlFilters({
    page: 1,
    limit: 25,
    q: "",
  });

  const logs = initialLogs || [];

  const columns = useMemo(
    () => [
      columnHelper.accessor(
        (row) =>
          row.combination?.product?.name ||
          row.combinations?.product?.name ||
          row.combination?.name ||
          row.combinations?.name,
        {
          id: "combination.product.name",
          header: "Product Name",
          cell: ({ row }) => {
            const name =
              row.original.combination?.product?.name ||
              row.original.combinations?.product?.name ||
              row.original.combination?.name ||
              row.original.combinations?.name ||
              `Item #${row.original.productId || row.original.combinationId || row.original.id}`;
            return (
              <div className="font-semibold text-foreground flex items-center gap-2">
                <ChartCandlestick className="h-4 w-4 text-primary" />
                {name}
              </div>
            );
          },
        },
      ),
      columnHelper.accessor("fromPrice", {
        header: () => <div className="text-right">Previous Price</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-muted-foreground line-through">
            ₱{Number(row.original.fromPrice || 0).toFixed(2)}
          </div>
        ),
      }),
      columnHelper.accessor("toPrice", {
        header: () => <div className="text-right">New Price</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono font-bold text-emerald-600">
            ₱{Number(row.original.toPrice || 0).toFixed(2)}
          </div>
        ),
      }),
      columnHelper.accessor("changedAt", {
        header: "Effective Date",
        cell: ({ row }) =>
          row.original.changedAt || row.original.createdAt
            ? new Date(
                row.original.changedAt || row.original.createdAt,
              ).toLocaleDateString()
            : "—",
      }),
      columnHelper.accessor((row) => row.user?.name, {
        id: "user.name",
        header: "Modified By",
        cell: ({ row }) =>
          row.original.user?.name || `User #${row.original.changedBy || 1}`,
      }),
    ],
    [],
  );

  const totalPages = meta ? meta.totalPages : 1;
  const totalCount = meta ? meta.total : logs.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Price History"
        description="Track historical unit price adjustments, supplier price increases, and retail pricing changes."
      />

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Product..."
            value={filters.q}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))
            }
            className="pl-9 h-10 text-xs"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historical Price Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={logs} paginate={false} />
        </CardContent>
      </Card>

      {meta && (
        <Pager
          meta={{
            total: totalCount,
            totalPages,
            currentPage: filters.page,
          }}
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
