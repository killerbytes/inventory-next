"use client";

import GoodReceiptModal from "@/components/modals/GoodReceiptModal";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { formatCurrency, formatDateTime, mappedStatusHistory } from "@/lib/utils";
import { GoodReceiptData, SupplierData } from "@/schemas";
import { useUIStore } from "@/stores/uiStore";
import {
  GoodReceiptSummary,
  ORDER_STATUS,
  ORDER_STATUS_OPTIONS,
  Pagination,
  PAGINATION,
  STATUS_COLOR,
} from "@/constants";
import { createColumnHelper } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DateRange } from "react-day-picker";
import ColumnSort, { FilterProps } from "@/components/common/ColumnSort";
import ColorBadge from "../common/ColorBadge";
import { DataTable } from "../common/DataTable";
import DateRangePicker from "../common/DateRangePicker";
import SummaryCard from "../common/SummaryCard";
import PageHeader from "../layout/PageHeader";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import React, { useMemo } from "react";

const columnHelper = createColumnHelper<GoodReceiptData>();

export default function GoodReceiptsClientWidget({
  initialRows,
  initialPagination,
  initialSummary,
  startDate,
  endDate,
  suppliers = [],
}: {
  initialRows?: GoodReceiptData[];
  initialPagination?: Pagination;
  initialSummary?: GoodReceiptSummary;
  startDate?: string;
  endDate?: string;
  suppliers?: SupplierData[];
}) {
  const { setGoodReceiptModalOpen } = useUIStore();
  const { filters, setFilters } = useUrlFilters({
    page: PAGINATION.PAGE,
    limit: PAGINATION.PAGE_SIZE,
    status: "ALL",
    q: "",
    startDate,
    endDate,
    sort: "receiptDate",
    order: "DESC",
  });
  const router = useRouter();

  const handleFilterChange = React.useCallback(
    (newFilter: FilterProps) => {
      setFilters((prev) => ({
        ...prev,
        ...newFilter,
        page: 1,
      }));
    },
    [setFilters],
  );

  const dateRange: DateRange = useMemo(
    () => ({
      from: filters.startDate ? parseISO(filters.startDate) : undefined,
      to: filters.endDate ? parseISO(filters.endDate) : undefined,
    }),
    [filters.startDate, filters.endDate],
  );
  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: ({ column }) => (
          <ColumnSort
            column={column as any}
            filter={filters}
            handleFilterChange={handleFilterChange}
            sortKey="id"
          >
            ID
          </ColumnSort>
        ),
        cell: ({ row }) => (
          <span className=" text-xs">{row.original.id}</span>
        ),
      }),
      columnHelper.accessor((row) => row.supplier?.name, {
        id: "supplier.name",
        header: ({ column }) => (
          <ColumnSort
            column={column as any}
            filter={filters}
            handleFilterChange={handleFilterChange}
            sortKey="supplier.name"
          >
            Supplier
          </ColumnSort>
        ),
        cell: ({ row }) => (
          <Link
            className="text-primary"
            href={`/suppliers/${row.original.supplier?.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.supplier?.name}
          </Link>
        ),
      }),
      columnHelper.accessor("status", {
        header: ({ column }) => (
          <ColumnSort
            column={column as any}
            filter={filters}
            handleFilterChange={handleFilterChange}
            sortKey="status"
          >
            Status
          </ColumnSort>
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          return <ColorBadge colorMap={STATUS_COLOR}>{status}</ColorBadge>;
        },
      }),
      columnHelper.accessor("goodReceiptStatusHistory", {
        header: "User",
        cell: ({ row }) => {
          const statusHistoryMap = mappedStatusHistory(
            row.original.goodReceiptStatusHistory ?? [],
          );
          return statusHistoryMap[row.original.status]?.user?.username;
        },
      }),
      columnHelper.accessor("receiptDate", {
        header: ({ column }) => (
          <ColumnSort
            column={column as any}
            filter={filters}
            handleFilterChange={handleFilterChange}
            sortKey="receiptDate"
          >
            Receipt Date
          </ColumnSort>
        ),
        meta: {
          className: "text-muted-foreground text-xs",
        },
        cell: ({ row }) => formatDateTime(row.original.receiptDate),
      }),
      columnHelper.accessor("referenceNo", {
        header: ({ column }) => (
          <ColumnSort
            column={column as any}
            filter={filters}
            handleFilterChange={handleFilterChange}
            sortKey="referenceNo"
          >
            Reference
          </ColumnSort>
        ),
      }),
      columnHelper.accessor("totalAmount", {
        header: ({ column }) => (
          <ColumnSort
            column={column as any}
            filter={filters}
            handleFilterChange={handleFilterChange}
            sortKey="totalAmount"
            align="right"
          >
            Total Amount
          </ColumnSort>
        ),
        meta: {
          align: "right",
        },
        cell: ({ row }) => formatCurrency(row.original.totalAmount || 0),
      }),
    ],
    [filters, handleFilterChange],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good Receipts"
        description="Track incoming supplier shipments, verify stock receipts, and manage PO arrivals."
      >
        <Button
          onClick={() => setGoodReceiptModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
        >
          <Plus className="h-4 w-4" /> Create Order
        </Button>
      </PageHeader>
      {initialSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xl">
          <SummaryCard
            label="Total Amount"
            value={formatCurrency(initialSummary.totalAmount)}
          />
          <SummaryCard
            label="Total Payable"
            value={
              <span className="text-red-500">
                {formatCurrency(initialSummary.totalPayableAmount)}
              </span>
            }
          />
          <SummaryCard
            label="Total Return"
            value={
              <span className="text-yellow-500">
                {formatCurrency(initialSummary.totalReturnAmount)}
              </span>
            }
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            setFilters((prev) => ({
              ...prev,
              startDate: range.from
                ? format(range.from, "yyyy-MM-dd")
                : undefined,
              endDate: range.to ? format(range.to, "yyyy-MM-dd") : undefined,
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
        data={initialRows || []}
        paginate={true}
        paginationMeta={initialPagination}
        onRowClick={(row) => {
          if (row.status === ORDER_STATUS.DRAFT) {
            setGoodReceiptModalOpen(true, row);
          } else {
            router.push(`/good-receipts/${row.id}`);
          }
        }}
      />
      <GoodReceiptModal suppliers={suppliers} />
    </div>
  );
}
