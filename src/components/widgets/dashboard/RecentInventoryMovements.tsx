"use client";

import { DataTable } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const columnHelper = createColumnHelper<any>();

interface RecentInventoryMovementsProps {
  movements?: any[];
}

export default function RecentInventoryMovements({
  movements = [],
}: RecentInventoryMovementsProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.combination?.product?.name, {
        id: "product",
        header: "Product",
        cell: ({ row }) => {
          const combo = row.original.combination;
          if (!combo)
            return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <Link
              href={`/products/${combo.productId}`}
              className="text-sm font-medium hover:underline text-primary"
            >
              {combo.name || combo.product?.name}
            </Link>
          );
        },
      }),
      columnHelper.accessor("referenceId", {
        header: "Reference #",
        cell: ({ row }) => {
          const refType = row.original.referenceType;
          const refId = row.original.referenceId;
          const label = refType ? `${refType}-${refId}` : `MOV-${row.original.id}`;
          const route =
            refType === "GOOD_RECEIPT"
              ? `/good-receipts/${refId}`
              : refType === "SALES_ORDER"
                ? `/sales-orders/${refId}`
                : null;

          return (
            <div className="text-foreground flex items-center gap-1.5 text-xs font-mono">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
              {route ? (
                <Link href={route} className="text-primary hover:underline">
                  {label}
                </Link>
              ) : (
                <span>{label}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: ({ row }) => {
          const type = row.original.movementType || row.original.type || "MOVEMENT";
          const isIn =
            type.includes("IN") || type === "PURCHASE" || type === "RECEIPT";
          return (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isIn
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
              }`}
            >
              {isIn ? (
                <ArrowDownLeft className="h-3 w-3" />
              ) : (
                <ArrowUpRight className="h-3 w-3" />
              )}
              {type}
            </span>
          );
        },
      }),
      columnHelper.accessor("quantity", {
        header: () => <div className="text-right">Quantity</div>,
        cell: ({ row }) => {
          const qty = Number(row.original.quantity || 0);
          return (
            <div className="text-right font-mono font-semibold text-xs">
              {qty > 0 ? `+${qty}` : qty}
            </div>
          );
        },
      }),
      columnHelper.accessor("costPerUnit", {
        header: () => <div className="text-right">Cost / Unit</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs text-muted-foreground">
            {formatCurrency(Number(row.original.costPerUnit || 0))}
          </div>
        ),
      }),
      columnHelper.accessor("totalCost", {
        header: () => <div className="text-right">Total Cost</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs font-medium">
            {formatCurrency(Number(row.original.totalCost || 0))}
          </div>
        ),
      }),
      columnHelper.accessor("referenceDate", {
        header: "Reference Date",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.referenceDate || row.original.updatedAt)}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.user?.name, {
        id: "user.name",
        header: "Recorded By",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.user?.name ||
              row.original.user?.username ||
              `User #${row.original.userId || "—"}`}
          </span>
        ),
      }),
    ],
    [],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Recent Inventory Movements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={movements}
          paginate={false}
          meta={{
            disabledRow: {
              "combination.deletedAt": true,
            },
          }}
        />
      </CardContent>
    </Card>
  );
}
