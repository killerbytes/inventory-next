"use client";

import { DataTable } from "@/components/common/DataTable";
import DateRangePicker from "@/components/common/DateRangePicker";
import { PagerMeta } from "@/components/common/Pager";
import PageHeader from "@/components/layout/PageHeader";
import OCRModal from "@/components/modals/OCRModal";
import SalesOrderModal from "@/components/modals/SalesOrderModal";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { formatCurrency, formatDateTime, mappedStatusHistory } from "@/lib/utils";
import { CustomerData, SalesOrderData } from "@/schemas";
import { useUIStore } from "@/stores/uiStore";
import {
  MODE_OF_PAYMENT_COLOR,
  ORDER_STATUS,
  ORDER_STATUS_OPTIONS,
  Pagination,
  SalesOrderSummary,
  STATUS_COLOR,
} from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import ColorBadge from "../common/ColorBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import SummaryCard from "../common/SummaryCard";

import ColumnSort, { FilterProps } from "@/components/common/ColumnSort";

const columnHelper = createColumnHelper<SalesOrderData>();

interface SalesOrdersClientWidgetProps {
  initialRows?: any[];
  initialPagination?: Pagination;
  startDate?: string;
  endDate?: string;
  customers: CustomerData[];
  initialSummary: SalesOrderSummary;
}

export default function SalesOrdersClientWidget({
  initialRows,
  initialPagination,
  startDate,
  endDate,
  customers,
  initialSummary,
}: SalesOrdersClientWidgetProps) {
  const { setSalesOrderModalOpen } = useUIStore();

  const [isOcrModalOpen, setIsOcrModalOpen] = React.useState(false);
  const { filters, setFilters } = useUrlFilters({
    page: 1,
    limit: 25,
    status: "ALL",
    q: "",
    startDate,
    endDate,
    sort: "orderDate",
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
      columnHelper.accessor("salesOrderNumber", {
        header: ({ column }) => (
          <ColumnSort
            column={column as any}
            filter={filters}
            handleFilterChange={handleFilterChange}
            sortKey="salesOrderNumber"
          >
            Order #
          </ColumnSort>
        ),
      }),
      columnHelper.accessor("orderDate", {
        header: ({ column }) => (
          <ColumnSort
            column={column as any}
            filter={filters}
            handleFilterChange={handleFilterChange}
            sortKey="orderDate"
          >
            Order Date
          </ColumnSort>
        ),
        cell: (info) => (
          <span className="text-muted-foreground text-xs">
            {formatDateTime(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("customer.name", {
        header: ({ column }) => (
          <ColumnSort
            column={column as any}
            filter={filters}
            handleFilterChange={handleFilterChange}
            sortKey="customer.name"
          >
            Customer
          </ColumnSort>
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
        cell: (info) => {
          return (
            <ColorBadge colorMap={STATUS_COLOR}>{info.getValue()}</ColorBadge>
          );
        },
      }),
      columnHelper.accessor("modeOfPayment", {
        header: "Payment Method",
        cell: (info) => {
          return (
            <ColorBadge colorMap={MODE_OF_PAYMENT_COLOR}>{info.getValue()}</ColorBadge>
          );
        },
      }),
      columnHelper.display({
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const statusHistoryMap = mappedStatusHistory(
            row.original.salesOrderStatusHistory ?? [],
          );
          return statusHistoryMap[row.original.status]?.user?.username;
        },
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
        cell: (info) => formatCurrency(info.getValue()),
      }),
    ],
    [filters, handleFilterChange],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Customer sales orders, fulfillment statuses, and billing ledgers."
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/50 gap-2"
            onClick={() => setIsOcrModalOpen(true)}
          >
            <Sparkles className="h-4 w-4" /> Scan Receipt (AI)
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => setSalesOrderModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Create Order
          </Button>
        </div>
      </PageHeader>

      {initialSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xl">
          <SummaryCard
            label="Total Amount"
            value={formatCurrency(initialSummary.totalAmount)}
          />
          <SummaryCard
            label="Total Profit"
            value={formatCurrency(initialSummary.totalProfitAmount)}
          />
          <SummaryCard
            label="Total Return"
            value={
              <span className="text-yellow-500">
                {formatCurrency(initialSummary.totalReturnAmount)}
              </span>
            }
          />
          <SummaryCard
            label="Total Exchange"
            value={
              <span className="text-yellow-500">
                {formatCurrency(initialSummary.totalExchangeAmount)}
              </span>
            }
          />
        </div>
      )}
      <div className="flex gap-4 items-center">
        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            setFilters((prev) => ({
              ...prev,
              startDate: range.from
                ? format(range.from, "yyyy-MM-dd")
                : undefined,
              endDate: range.to
                ? format(range.to, "yyyy-MM-dd")
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
        data={initialRows}
        paginate={true}
        paginationMeta={initialPagination}
        paginationFilter={filters}
        setPaginationFilter={setFilters}
        onRowClick={(row) => {
          if (row.status === ORDER_STATUS.DRAFT) {
            setSalesOrderModalOpen(true, row);
          } else {
            router.push(`/sales-orders/${row.id}`);
          }
        }}
      />
      <SalesOrderModal customers={customers} />
      <OCRModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
      />
    </div>
  );
}
