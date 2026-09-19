"use client";

import { useUrlFilters } from "@/hooks/useUrlFilters";
import { formatDateTime } from "@/lib/utils";
import { GoodReceiptData } from "@/schemas";
import {
  Meta,
  ORDER_STATUS_OPTIONS,
  PAGINATION,
  STATUS_COLOR,
} from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DateRange } from "react-day-picker";
import ColorBadge from "../common/ColorBadge";
import { DataTable } from "../common/DataTable";
import DateRangePicker from "../common/DateRangePicker";
import PageHeader from "../layout/PageHeader";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const columnHelper = createColumnHelper<GoodReceiptData>();

export default function GoodReceiptsClientWidget({
  rows,
  meta,
  startDate,
  endDate,
}: {
  rows?: GoodReceiptData[];
  meta?: Meta;
  startDate?: string;
  endDate?: string;
}) {
  const { filters, setFilters } = useUrlFilters({
    page: PAGINATION.PAGE,
    limit: PAGINATION.PAGE_SIZE,
    status: "ALL",
    q: "",
    startDate,
    endDate,
  });
  const router = useRouter();
  const dateRange: DateRange = useMemo(
    () => ({
      from: filters.startDate ? new Date(filters.startDate) : undefined,
      to: filters.endDate ? new Date(filters.endDate) : undefined,
    }),
    [filters.startDate, filters.endDate],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.id}</span>
        ),
      }),
      columnHelper.accessor("referenceNo", {
        header: "Reference",
        cell: ({ row }) => (
          <div className="font-semibold text-foreground flex items-center gap-2">
            {row.original.referenceNo || `GR-${row.original.id}`}
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.supplier?.name, {
        id: "supplier.name",
        header: "Supplier",
        cell: ({ row }) => (
          <span>{row.original.supplier?.name || "Supplier"}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status || "DRAFT";
          return <ColorBadge colorMap={STATUS_COLOR}>{status}</ColorBadge>;
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Receipt Date",
        meta: {
          className: "text-muted-foreground text-xs",
        },
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      }),
      columnHelper.accessor("totalAmount", {
        header: () => <div className="text-right">Total Amount</div>,
        cell: ({ row }) => (
          <div className="text-right font-bold text-emerald-600">
            ₱
            {Number(row.original.totalAmount || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good Receipts"
        description="Track incoming supplier shipments, verify stock receipts, and manage PO arrivals."
      >
        <Link href="/good-receipts/create">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
            <Plus className="h-4 w-4" /> Create Order
          </Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            setFilters((prev) => ({
              ...prev,
              startDate: range.from
                ? range.from.toISOString().split("T")[0]
                : undefined,
              endDate: range.to
                ? range.to.toISOString().split("T")[0]
                : undefined,
              page: 1,
            }));
          }}
        />

        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value, page: 1 }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={rows || []}
        paginate={true}
        paginationMeta={meta}
        onRowClick={(row) => {
          router.push(`/good-receipts/${row.id}`);
        }}
      />
    </div>
  );
}
