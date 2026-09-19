"use client";

import { DataTable } from "@/components/common/DataTable";
import DateRangePicker from "@/components/common/DateRangePicker";
import { PagerMeta } from "@/components/common/Pager";
import PageHeader from "@/components/layout/PageHeader";
import OCRModal from "@/components/modals/OCRModal";
import SalesOrderModal from "@/components/modals/SalesOrderModal";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { CustomerData } from "@/schemas";
import { useUIStore } from "@/stores/uiStore";
import { ORDER_STATUS_OPTIONS, STATUS_COLOR } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";
import { DateRange } from "react-day-picker";
import ColorBadge from "../common/ColorBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const columnHelper = createColumnHelper<any>();

interface SalesOrdersClientWidgetProps {
  rows?: any[];
  meta?: PagerMeta;
  startDate?: string;
  endDate?: string;
  customers: CustomerData[];
}

export default function SalesOrdersClientWidget({
  rows,
  meta,
  startDate,
  endDate,
  customers,
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
      columnHelper.accessor("salesOrderNumber", {
        header: "Order #",
      }),
      columnHelper.accessor("orderDate", {
        header: "Order Date",
        cell: (info) => (
          <span className="text-muted-foreground text-xs">
            {formatDateTime(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("customer.name", {
        header: "Customer",
        cell: (info) => (
          <span className="font-medium text-sm">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          return (
            <ColorBadge colorMap={STATUS_COLOR}>{info.getValue()}</ColorBadge>
          );
        },
      }),
      columnHelper.accessor("totalAmount", {
        header: () => "Total Amount",
        meta: {
          className: "font-bold text-emerald-600",
          align: "right",
        },
        cell: (info) => formatCurrency(info.getValue()),
      }),
    ],
    [],
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
      <div className="flex gap-4 items-center">
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
        data={rows}
        paginate={true}
        paginationMeta={meta}
        onRowClick={(row) => {
          router.push(`/sales-orders/${row.id}`);
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
