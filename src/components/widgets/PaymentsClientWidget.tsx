"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Banknote, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/common/DataTable";
import Pager from "@/components/common/Pager";
import PageHeader from "@/components/layout/PageHeader";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { createColumnHelper } from "@tanstack/react-table";

const columnHelper = createColumnHelper<any>();

interface PaymentsClientWidgetProps {
  initialPayments?: any[];
}

export default function PaymentsClientWidget({
  initialPayments = [],
}: PaymentsClientWidgetProps) {
  const { filters, setFilters } = useUrlFilters({
    page: 1,
    limit: 25,
    q: "",
  });

  const payments = initialPayments || [];

  const filteredPayments = useMemo(() => {
    return payments.filter((pay) => {
      return (
        !filters.q ||
        (pay.paymentNumber || `PAY-${pay.id}`)
          .toLowerCase()
          .includes(filters.q.toLowerCase())
      );
    });
  }, [payments, filters.q]);

  const paginatedPayments = useMemo(() => {
    const start = (filters.page - 1) * filters.limit;
    return filteredPayments.slice(start, start + filters.limit);
  }, [filteredPayments, filters.page, filters.limit]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("paymentNumber", {
        header: "Payment Ref",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-semibold">
            <Banknote className="h-4 w-4 text-emerald-600" />
            <Link
              href={`/payments/${row.original.id}`}
              className="text-primary hover:underline"
            >
              {row.original.paymentNumber || `PAY-${row.original.id}`}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor("paymentMethod", {
        header: "Method",
        cell: ({ row }) => (
          <Badge variant="outline" className="uppercase font-mono text-xs">
            {row.original.paymentMethod || "CASH"}
          </Badge>
        ),
      }),
      columnHelper.accessor("paymentDate", {
        header: "Payment Date",
        cell: ({ row }) =>
          row.original.paymentDate
            ? new Date(row.original.paymentDate).toLocaleDateString()
            : "—",
      }),
      columnHelper.accessor("amount", {
        header: () => <div className="text-right">Amount Paid</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono font-bold text-emerald-600">
            ₱{Number(row.original.amount || 0).toFixed(2)}
          </div>
        ),
      }),
    ],
    [],
  );

  const totalPages = Math.ceil(filteredPayments.length / filters.limit) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Transactions Audit"
        description="Audit ledger of inbound customer collections and outbound supplier disbursements."
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search Payment Ref..."
          value={filters.q}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))
          }
          className="pl-9 h-10 text-xs"
        />
      </div>

      <DataTable columns={columns} data={paginatedPayments} paginate={false} />

      <Pager
        meta={{
          total: filteredPayments.length,
          totalPages,
          currentPage: filters.page,
        }}
        filter={filters}
        setFilter={(action: any) => {
          const next = typeof action === "function" ? action(filters) : action;
          setFilters(next);
        }}
      />
    </div>
  );
}
