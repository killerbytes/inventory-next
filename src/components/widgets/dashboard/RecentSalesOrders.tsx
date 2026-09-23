"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatDateTime,
  mappedStatusHistory,
} from "@/lib/utils";
import { SalesOrderData } from "@/schemas";
import {
  MODE_OF_PAYMENT_COLOR,
  ORDER_STATUS,
  STATUS_COLOR,
} from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

const columnHelper = createColumnHelper<SalesOrderData>();

interface RecentSalesOrdersProps {
  orders?: SalesOrderData[];
}

export default function RecentSalesOrders({
  orders = [],
}: RecentSalesOrdersProps) {
  const router = useRouter();

  const columns = useMemo(
    () => [
      columnHelper.accessor("salesOrderNumber", {
        header: "Order #",
        cell: ({ row }) => (
          <Link
            href={`/sales-orders/${row.original.id}`}
            className="font-mono text-xs font-semibold text-primary hover:underline"
          >
            {row.original.salesOrderNumber}
          </Link>
        ),
      }),
      columnHelper.accessor("orderDate", {
        header: "Order Date",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.orderDate)}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.customer?.name, {
        id: "customer.name",
        header: "Customer",
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {row.original.customer?.name}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => (
          <ColorBadge colorMap={STATUS_COLOR}>
            {String(row.original.status)}
          </ColorBadge>
        ),
      }),
      columnHelper.accessor("modeOfPayment", {
        header: () => <div className="text-center">Payment Mode</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <ColorBadge colorMap={MODE_OF_PAYMENT_COLOR}>
              {String(row.original.modeOfPayment)}
            </ColorBadge>
          </div>
        ),
      }),
      columnHelper.display({
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const statusHistoryMap = mappedStatusHistory(
            row.original.salesOrderStatusHistory ?? [],
          );
          const username =
            statusHistoryMap[row.original.status]?.user?.username || "—";
          return (
            <span className="text-xs text-muted-foreground">{username}</span>
          );
        },
      }),
      columnHelper.display({
        id: "totalAmount",
        header: () => <div className="text-right">Total Amount</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono font-semibold">
            {formatCurrency(row.original.totalAmount)}
          </div>
        ),
      }),
    ],
    [],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Recent Sales Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={orders}
          paginate={false}
          meta={{
            disabledRow: {
              status: ORDER_STATUS.VOID,
            },
          }}
          onRowClick={(item: any) => {
            if (item.status !== ORDER_STATUS.DRAFT) {
              router.push(`/sales-orders/${item.id}`);
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
