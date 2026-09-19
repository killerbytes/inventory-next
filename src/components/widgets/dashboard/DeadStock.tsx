"use client";

import ColorBadge from "@/components/common/ColorBadge";
import ColumnSort, { FilterProps } from "@/components/common/ColumnSort";
import { DataTable } from "@/components/common/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UNIT_COLOR } from "@/types/definitions";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

interface DeadStockProps {
  items?: any[];
}

export default function DeadStock({ items = [] }: DeadStockProps) {
  const [filter, setFilter] = useState<FilterProps>({
    sort: "quantity",
    order: "DESC",
  });

  const handleFilterChange = useCallback((newFilter: FilterProps) => {
    setFilter((prev) => ({
      ...prev,
      ...newFilter,
    }));
  }, []);

  const sortedItems = useMemo(() => {
    const list = [...items];
    const { sort, order } = filter;
    if (!sort) return list;

    return list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sort === "name") {
        valA = a.name || "";
        valB = b.name || "";
        return order === "ASC"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      } else if (sort === "quantity") {
        valA = Number(a.inventory?.quantity ?? a.quantity ?? 0);
        valB = Number(b.inventory?.quantity ?? b.quantity ?? 0);
        return order === "ASC" ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [items, filter]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <ColumnSort
            column={column}
            filter={filter}
            handleFilterChange={handleFilterChange}
            sortKey="name"
          >
            Name
          </ColumnSort>
        ),
        cell: ({ row }) => (
          <Link
            href={`/products/${row.original.productId}`}
            className="flex items-center gap-2 hover:underline text-primary text-sm font-medium"
          >
            <ColorBadge colorMap={UNIT_COLOR}>
              {row.original.unit || "PCS"}
            </ColorBadge>
            <span>{row.original.name}</span>
          </Link>
        ),
      },
      {
        id: "quantity",
        accessorKey: "inventory.quantity",
        header: ({ column }) => (
          <div className="flex justify-end">
            <ColumnSort
              column={column}
              filter={filter}
              handleFilterChange={handleFilterChange}
              align="right"
              sortKey="quantity"
            >
              Quantity
            </ColumnSort>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right font-mono font-semibold text-xs text-muted-foreground">
            {Number(
              row.original.inventory?.quantity ?? row.original.quantity ?? 0,
            )}
          </div>
        ),
      },
    ],
    [filter, handleFilterChange],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Dead Stock</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={sortedItems}
          paginate={false}
          meta={{ disabledRow: { isActive: false } }}
        />
      </CardContent>
    </Card>
  );
}
