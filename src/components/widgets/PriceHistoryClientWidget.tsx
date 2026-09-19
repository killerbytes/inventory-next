"use client";

import { DataTable } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createColumnHelper } from "@tanstack/react-table";
import { ChartCandlestick } from "lucide-react";
import { useMemo } from "react";
import PageHeader from "../layout/PageHeader";

const columnHelper = createColumnHelper<any>();

interface PriceHistoryClientWidgetProps {
  initialLogs: any[];
}

export default function PriceHistoryClientWidget({
  initialLogs,
}: PriceHistoryClientWidgetProps) {
  const logs = initialLogs || [];

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.combinations?.product?.name, {
        id: "combinations.product.name",
        header: "Product Name",
        cell: ({ row }) => {
          const name =
            row.original.combinations?.product?.name ||
            `Item #${row.original.productId || row.original.combinationId || row.original.id}`;
          return (
            <div className="font-semibold text-foreground flex items-center gap-2">
              <ChartCandlestick className="h-4 w-4 text-primary" />
              {name}
            </div>
          );
        },
      }),
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Price History"
        description="Track historical unit price adjustments, supplier price increases, and retail pricing changes."
      />

      <Card>
        <CardHeader>
          <CardTitle>Historical Price Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
