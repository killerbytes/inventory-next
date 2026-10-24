"use client";

import { DataTable } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createColumnHelper } from "@tanstack/react-table";
import { Award } from "lucide-react";
import { useMemo } from "react";
import PageHeader from "../layout/PageHeader";
import Link from "next/link";
import ColorBadge from "../common/ColorBadge";
import { PAGINATION, UNIT_COLOR } from "@/constants";
import { Pagination } from "@/types";
import DateRangePicker from "../common/DateRangePicker";
import { DateRange } from "react-day-picker";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { format, parseISO } from "date-fns";

const columnHelper = createColumnHelper<any>();

interface PopularProductsClientWidgetProps {
  initialProducts: any[];
  initialPagination: Pagination;
  startDate: string;
  endDate: string;
}

export default function PopularProductsClientWidget({
  initialProducts,
  initialPagination,
  startDate,
  endDate,
}: PopularProductsClientWidgetProps) {
  const products = initialProducts || [];
  const { filters, setFilters } = useUrlFilters({
    page: PAGINATION.PAGE,
    limit: PAGINATION.PAGE_SIZE,
    status: "ALL",
    q: "",
    startDate,
    endDate,
    sort: "transactionCount",
    order: "DESC",
  });

  const dateRange: DateRange = useMemo(
    () => ({
      from: filters.startDate ? parseISO(filters.startDate) : undefined,
      to: filters.endDate ? parseISO(filters.endDate) : undefined,
    }),
    [filters.startDate, filters.endDate],
  );


  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "rank",
        header: "Rank",
        cell: ({ row }) => (
          <div className="font-bold text-primary flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />#{row.index + 1}
          </div>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <ColorBadge colorMap={UNIT_COLOR}>{row.original.combination.unit}</ColorBadge>
            <Link className="text-primary hover:underline" href={`/products/${row.original.combination.productId}`}>{row.original.combination.name}</Link>
          </div>
        ),
      }),
      columnHelper.accessor("transactionCount", {
        header: "Transactions",
        meta: {
          align: 'right'
        },
        cell: ({ row }) => (
          <span className=" text-xs uppercase">
            {row.original.transactionCount}
          </span>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Popular Products"
        description="Top-selling product combinations ranked by sales volume and total generated revenue."
      />

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <DateRangePicker
          value={dateRange}
          commitOnClose
          onChange={(range) => {
            if (range?.from && range?.to) {
              setFilters({
                startDate: format(range.from, "yyyy-MM-dd"),
                endDate: format(range.to, "yyyy-MM-dd"),
                page: 1,
              });
            } else if (!range?.from && !range?.to) {
              setFilters({
                startDate: undefined,
                endDate: undefined,
                page: 1,
              });
            }
          }}
        />

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Items</CardTitle>
        </CardHeader>
        <CardContent>

          <DataTable
            columns={columns}
            data={products}
            searchKey="name"
            paginate={true}
            paginationMeta={initialPagination}
            paginationFilter={filters}
            setPaginationFilter={setFilters}
          />
        </CardContent>
      </Card>
    </div>
  );
}
