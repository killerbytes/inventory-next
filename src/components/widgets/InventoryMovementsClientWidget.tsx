"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import DateRangePicker from "@/components/common/DateRangePicker";
import Pager from "@/components/common/Pager";
import SummaryCard from "@/components/common/SummaryCard";
import PageHeader from "@/components/layout/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useDebounce from "@/hooks/useDebounce";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  INVENTORY_MOVEMENT_REFERENCE_TYPE,
  INVENTORY_MOVEMENT_TYPE_COLOR,
  INVENTORY_MOVEMENT_TYPE_OPTIONS,
  Meta,
  UNIT_COLOR,
} from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import { ClipboardList, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";

const columnHelper = createColumnHelper<any>();

interface InventoryMovementsClientWidgetProps {
  initialMovements: any[];
  meta?: Meta;
  summary?: {
    totalValue?: { label: string; value: number };
    totalQuantity?: { label: string; value: number };
  };
  startDate?: string;
  endDate?: string;
}

export default function InventoryMovementsClientWidget({
  initialMovements,
  meta,
  summary,
  startDate,
  endDate,
}: InventoryMovementsClientWidgetProps) {
  const { filters, setFilters } = useUrlFilters({
    page: 1,
    limit: 25,
    status: "ALL",
    q: "",
    startDate,
    endDate,
  });

  const [searchQuery, setSearchQuery] = useState(filters.q || "");
  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    setSearchQuery(filters.q || "");
  }, [filters.q]);

  useEffect(() => {
    if (debouncedQuery !== (filters.q || "")) {
      setFilters((prev) => ({
        ...prev,
        q: debouncedQuery,
        page: 1,
      }));
    }
  }, [debouncedQuery, filters.q, setFilters]);

  const dateRange: DateRange = useMemo(
    () => ({
      from: filters.startDate ? parseISO(filters.startDate) : undefined,
      to: filters.endDate ? parseISO(filters.endDate) : undefined,
    }),
    [filters.startDate, filters.endDate],
  );

  const movements = initialMovements || [];

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.combination?.product?.name, {
        id: "combination.product.name",
        header: "Product Name",
        cell: ({ row }) => (
          <Link
            className="flex gap-2 items-center text-primary hover:underline"
            href={`/products/${row.original.combination?.productId || 1}`}
          >
            <ColorBadge colorMap={UNIT_COLOR}>
              {String(row.original.combination?.unit || "")}
            </ColorBadge>
            <span>{row.original.combination?.name}</span>
          </Link>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        meta: {
          align: "center",
          headerClassName: "text-center",
          className: "text-center",
        },
        cell: ({ row }) => (
          <ColorBadge colorMap={INVENTORY_MOVEMENT_TYPE_COLOR}>
            {row.original.type}
          </ColorBadge>
        ),
      }),
      columnHelper.accessor("quantity", {
        header: "Quantity",
        meta: {
          align: "right",
          headerClassName: "text-right",
          className: "text-right",
        },
        cell: ({ row }) => (
          <span className="font-mono">{Number(row.original.quantity)}</span>
        ),
      }),
      columnHelper.accessor("costPerUnit", {
        header: "Cost Per Unit",
        meta: {
          align: "right",
          headerClassName: "text-right",
          className: "text-right",
        },
        cell: ({ row }) => (
          <span className="font-mono">
            {formatCurrency(Number(row.original.costPerUnit || 0))}
          </span>
        ),
      }),
      columnHelper.accessor("totalCost", {
        header: "Total Cost",
        meta: {
          align: "right",
          headerClassName: "text-right",
          className: "text-right",
        },
        cell: ({ row }) => (
          <span className="font-mono">
            {formatCurrency(Number(row.original.totalCost || 0))}
          </span>
        ),
      }),
      columnHelper.accessor("referenceId", {
        header: "Reference",
        cell: ({ row }) => {
          let route: string | null = null;
          if (
            row.original.referenceType ===
            INVENTORY_MOVEMENT_REFERENCE_TYPE.GOOD_RECEIPT
          ) {
            route = `/good-receipts/${row.original.referenceId}`;
          } else if (
            row.original.referenceType ===
            INVENTORY_MOVEMENT_REFERENCE_TYPE.SALES_ORDER
          ) {
            route = `/sales-orders/${row.original.referenceId}`;
          }

          const label = `${row.original.referenceType || "REF"}-${row.original.referenceId}`;

          return route ? (
            <Link
              href={route}
              className="text-primary hover:underline flex items-center gap-1.5 font-medium"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              {label}
            </Link>
          ) : (
            <div className="text-foreground flex items-center gap-1.5 text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              {label}
            </div>
          );
        },
      }),
      columnHelper.accessor("referenceDate", {
        header: "Reference Date",
        meta: {
          className: "w-0 whitespace-nowrap text-xs text-muted-foreground",
        },
        cell: ({ row }) => formatDate(row.original.referenceDate),
      }),
      columnHelper.accessor("updatedAt", {
        header: "Updated At",
        meta: {
          className: "w-0 whitespace-nowrap text-xs text-muted-foreground",
        },
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      }),
      columnHelper.accessor((row) => row.user?.username || row.user?.name, {
        id: "user.username",
        header: "Recorded By",
        cell: ({ row }) =>
          row.original.user?.username ||
          row.original.user?.name ||
          (row.original.userId ? `User #${row.original.userId}` : "—"),
      }),
    ],
    [],
  );

  const totalPages = meta ? meta.totalPages : 1;
  const totalCount = meta ? meta.total : movements.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Movements"
        description="Audit trail of all inbound receipts, sales stock subtractions, adjustments, and break packs."
      />

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SummaryCard
            label={summary.totalQuantity?.label || "Total Movement Volume"}
            value={Number(summary.totalQuantity?.value || 0).toLocaleString()}
          />
          <SummaryCard
            label={summary.totalValue?.label || "Total Movement Value"}
            value={formatCurrency(summary.totalValue?.value || 0)}
          />
          <SummaryCard
            label="Total Audited Records"
            value={totalCount.toLocaleString()}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
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

        <InputGroup>
          <InputGroupInput
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                status: value,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Movement Type" />
            </SelectTrigger>
            <SelectContent>
              {INVENTORY_MOVEMENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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

      <Pager
        meta={{
          total: totalCount,
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
