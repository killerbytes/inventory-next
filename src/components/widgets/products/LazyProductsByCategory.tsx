"use client";

import ColorBadge from "@/components/common/ColorBadge";
import DataTable from "@/components/common/DataTable";
import { formatCurrency } from "@/lib/utils";
import { ProductCombinationData } from "@/schemas";
import { getProductCombinationsByCategoryIdAction } from "@/server/actions/product.actions";
import { UNIT_COLOR } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import React from "react";

const columnHelper = createColumnHelper<ProductCombinationData>();

export function LazyProductsByCategory({ categoryId }: { categoryId: number }) {
  const [data, setData] = React.useState<ProductCombinationData[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  React.useEffect(() => {
    (async () => {
      setIsLoading(true);
      const result = await getProductCombinationsByCategoryIdAction(categoryId);
      setData(result);
      setIsLoading(false);
    })();
  }, [categoryId]);

  const columns = React.useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: ({ row }) => (
          <div
            style={{
              paddingLeft: `${row.depth}rem`,
            }}
          >
            <div className="flex items-center gap-2">
              <ColorBadge colorMap={UNIT_COLOR}>{row.original.unit}</ColorBadge>
              <Link
                href={`/products/${row.original.productId}`}
                className="text-primary"
              >
                {row.original.name}
              </Link>
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("sku", {
        header: "SKU",
        meta: {
          className: "text-xs text-muted-foreground",
        },
      }),
      columnHelper.accessor("inventory.quantity", {
        header: "Quantity",
        cell: ({ row }) => Number(row.original.inventory?.quantity) || 0,
      }),
      columnHelper.accessor("price", {
        header: "Price",
        cell: ({ row }) => formatCurrency(Number(row.original.price) || 0),
      }),
    ],
    [],
  );
  return (
    <>
      {isLoading ? (
        <Loader2Icon className="animate-spin" />
      ) : (
        <DataTable
          data={data || []}
          columns={columns}
          meta={{
            disabledRow: { isActive: false },
            emptyText: "No combinations found",
          }}
        />
      )}
    </>
  );
}
