"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import Loader from "@/components/common/Loader";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import useDebounce from "@/hooks/useDebounce";
import { getMappedSearchProductCombinations } from "@/lib/api-clients/productSearch";
import { formatCurrency } from "@/lib/utils";
import { getCategoriesAction } from "@/server/actions/category.actions";
import { GLOBAL_COLOR, ROUTES, UNIT_COLOR } from "@/types/definitions";
import { ColumnDef, Row } from "@tanstack/react-table";
import { cx } from "class-variance-authority";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface SearchClientWidgetProps {
  initialCategories?: any[];
  initialSearch?: string;
}

/**
 * SearchClientWidget - Real-time product search with full parity to inventory-react.
 * Provides tokenized full-text search, live URL syncing, and formatted inventory/SRP metrics.
 */
export default function SearchClientWidget({
  initialCategories = [],
  initialSearch,
}: SearchClientWidgetProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlQuery = searchParams?.get("search") || initialSearch || "";
  const [search, setSearch] = useState(urlQuery);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>(initialCategories);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch categories client-side if not pre-seeded
  useEffect(() => {
    if (categories.length === 0) {
      getCategoriesAction().then((res) => {
        if (Array.isArray(res)) {
          setCategories(res);
        }
      });
    }
  }, [categories.length]);

  const mappedCategory = useMemo(
    () => new Map(categories.map((item: any) => [item.id, item])),
    [categories],
  );

  const debouncedQuery = useDebounce(search, 300);

  const getData = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const results = await getMappedSearchProductCombinations({
        search: debouncedQuery,
      });
      setData(results || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    getData();
  }, [getData]);

  useEffect(() => {
    const currentParam = searchParams?.get("search") || "";
    if (currentParam === debouncedQuery) return;

    const params = new URLSearchParams(searchParams?.toString() || "");
    if (debouncedQuery) {
      params.set("search", debouncedQuery);
    } else {
      params.delete("search");
    }

    const queryString = params.toString();
    const newPath = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newPath, { scroll: false });
  }, [debouncedQuery, pathname, router, searchParams]);

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        header: "Unit",
        accessorKey: "unit",
        meta: {
          headerClassName: "h-0",
          className: "w-20 text-xs",
        },
        cell: ({ row }: { row: Row<any> }) => {
          return (
            <ColorBadge colorMap={UNIT_COLOR}>{row.original.unit}</ColorBadge>
          );
        },
      },
      {
        accessorKey: "Product",
        header: "Product",
        cell: ({ row }: { row: Row<any> }) => {
          const categoryId =
            row.original.product?.categoryId ?? row.original.categoryId;
          return (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                {mappedCategory.get(categoryId)?.name}
              </span>
              <Link
                className={GLOBAL_COLOR.PRODUCT}
                href={`${ROUTES.PRODUCTS}/${row.original.productId}`}
              >
                {row.original.name}
              </Link>
            </div>
          );
        },
      },
      {
        accessorKey: "price",
        header: () => <div className="text-right">SRP</div>,
        meta: {
          headerClassName: "h-0 text-right",
          className: "w-20 text-right font-bold",
        },
        cell: ({ row }: { row: Row<any> }) => {
          const price = Number(row.original.price ?? 0);
          const avgPrice = Number(row.original.inventory?.averagePrice ?? 0);
          const error = price > 0 && avgPrice >= price;
          return (
            <div
              className={cx("text-right font-bold", {
                "text-red-500 font-bold": error,
              })}
            >
              {formatCurrency(price)}
            </div>
          );
        },
      },
      {
        accessorKey: "inventory.averagePrice",
        header: () => <div className="text-right">Avg Price</div>,
        meta: {
          headerClassName: "h-0 text-right",
          className: "w-20 text-right text-gray-500 text-xs",
        },
        cell: ({ row }: { row: Row<any> }) => {
          return (
            <div className="text-right text-gray-500 text-xs">
              {formatCurrency(Number(row.original.inventory?.averagePrice || 0))}
            </div>
          );
        },
      },
      {
        header: () => <div className="text-right">Quantity</div>,
        accessorKey: "inventory.quantity",
        meta: {
          headerClassName: "h-0 text-right",
          className: "w-20 text-right",
        },
        cell: ({ row }: { row: Row<any> }) => {
          return (
            <div className="text-right font-semibold">
              {Number(row.original.inventory?.quantity || 0)}
            </div>
          );
        },
      },
    ],
    [mappedCategory],
  );

  return (
    <div className="flex flex-col gap-2 p-2 md:gap-4 md:p-4">
      <InputGroup className="bg-background">
        <InputGroupInput
          ref={inputRef}
          placeholder="Search..."
          value={search}
          autoFocus
          onChange={(e) => setSearch(e.target.value)}
        />
        <InputGroupAddon>
          <Search className="h-4 w-4" />
        </InputGroupAddon>
        {search.length > 0 && (
          <>
            {loading ? (
              <InputGroupAddon align="inline-end">
                <Spinner />
              </InputGroupAddon>
            ) : (
              <>
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setSearch("");
                      inputRef.current?.focus();
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </InputGroupButton>
                </InputGroupAddon>

                <InputGroupAddon align="inline-end">
                  {data.length} results
                </InputGroupAddon>
              </>
            )}
          </>
        )}
      </InputGroup>
      <div
        className={cx(
          "relative rounded overflow-hidden",
          loading && "min-h-[200px]",
        )}
      >
        <Loader isLoading={loading} />
        <DataTable data={data} columns={columns} />
      </div>
    </div>
  );
}
