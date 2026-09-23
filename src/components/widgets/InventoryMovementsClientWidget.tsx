"use client";

import { DataTable } from "@/components/common/DataTable";
import DateRangePicker from "@/components/common/DateRangePicker";
import Pager from "@/components/common/Pager";
import PageHeader from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { formatDate } from "@/lib/utils";
import {
  INVENTORY_MOVEMENT_TYPE_COLOR,
  INVENTORY_MOVEMENT_TYPE_OPTIONS,
  UNIT_COLOR,
} from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { cx } from "class-variance-authority";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { DateRange } from "react-day-picker";
import ColorBadge from "../common/ColorBadge";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const columnHelper = createColumnHelper<any>();

interface InventoryMovementsClientWidgetProps {
  initialMovements: any[];
}

export default function InventoryMovementsClientWidget({
  initialMovements,
}: InventoryMovementsClientWidgetProps) {
  const { filters, setFilters } = useUrlFilters({
    page: 1,
    limit: 25,
    status: "ALL",
    q: "",
  });

  const movements = initialMovements || [];

  const dateRange: DateRange = useMemo(
    () => ({
      from: filters.startDate ? new Date(filters.startDate) : undefined,
      to: filters.endDate ? new Date(filters.endDate) : undefined,
    }),
    [filters.startDate, filters.endDate],
  );

  const filteredMovements = useMemo(() => {
    return movements.filter((mov) => {
      // Search filter
      const matchesSearch =
        !filters.q ||
        (mov.referenceType
          ? `${mov.referenceType}-${mov.referenceId}`
          : `MOV-${mov.id}`
        )
          .toLowerCase()
          .includes(filters.q.toLowerCase()) ||
        (mov.combination?.product?.name || "")
          .toLowerCase()
          .includes(filters.q.toLowerCase());

      // Type filter
      const type = mov.movementType || mov.type || "MOVEMENT";
      const matchesStatus =
        filters.status === "ALL" ||
        type.toUpperCase() === filters.status.toUpperCase();

      // Date range filter
      const movDate = mov.createdAt ? new Date(mov.createdAt) : null;
      let matchesDate = true;
      if (movDate && dateRange?.from) {
        matchesDate = matchesDate && movDate >= dateRange.from;
      }
      if (movDate && dateRange?.to) {
        matchesDate = matchesDate && movDate <= dateRange.to;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [movements, filters.q, filters.status, dateRange]);

  const paginatedMovements = useMemo(() => {
    const start = (filters.page - 1) * filters.limit;
    return filteredMovements.slice(start, start + filters.limit);
  }, [filteredMovements, filters.page, filters.limit]);

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.combination?.product?.name, {
        id: "combination.product.name",
        header: "Product Name",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <ColorBadge colorMap={UNIT_COLOR}>
              {row.original.combination?.unit}
            </ColorBadge>
            <Link
              className="text-primary"
              href={`/products/${row.original.combination?.productId}`}
            >
              {row.original.combination?.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor("referenceId", {
        header: "Reference #",
        cell: ({ row }) => (
          <div className="text-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            {row.original.referenceType
              ? `${row.original.referenceType}-${row.original.referenceId}`
              : `MOV-${row.original.id}`}
          </div>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: ({ row }) => {
          const type = row.original.type;
          const isIn =
            type.includes("IN") || type === "PURCHASE" || type === "RECEIPT";

          const color =
            INVENTORY_MOVEMENT_TYPE_COLOR[
              type as keyof typeof INVENTORY_MOVEMENT_TYPE_COLOR
            ];

          return (
            <Badge className={cx(color)}>
              {type}
              {isIn ? (
                <ArrowDownLeft className="h-3 w-3" />
              ) : (
                <ArrowUpRight className="h-3 w-3" />
              )}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("quantity", {
        header: "Quantity",
        cell: ({ row }) => Number(row.original.quantity),
      }),
      columnHelper.accessor("referenceDate", {
        header: "Reference Date",
        cell: ({ row }) => {
          console.log(row.original);

          return formatDate(row.original.referenceDate);
        },
      }),
      columnHelper.accessor((row) => row.user?.name, {
        id: "user.name",
        header: "Recorded By",
        cell: ({ row }) =>
          row.original.user?.name || `User #${row.original.userId}`,
      }),
    ],
    [],
  );

  const totalPages = Math.ceil(filteredMovements.length / filters.limit) || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Movements"
        description="Audit trail of all inbound receipts, sales stock subtractions, adjustments, and break packs."
      />

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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Reference or Product..."
              value={filters.q}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))
              }
              className="pl-9 h-10 text-xs"
            />
          </div>

          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                status: value,
                page: 1,
              }))
            }
            items={INVENTORY_MOVEMENT_TYPE_OPTIONS}
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

      <DataTable columns={columns} data={paginatedMovements} paginate={false} />

      <Pager
        meta={{
          total: filteredMovements.length,
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
