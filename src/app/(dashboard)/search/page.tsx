"use client";

import { DataTable } from "@/components/common/DataTable";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchProductCombinationsAction } from "@/server/actions/product.actions";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchProductCombinationsAction({ search: query });
        setResults(data || []);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => (
        <Badge variant="outline" className="uppercase font-mono text-xs">
          {row.original.unit || "PCS"}
        </Badge>
      ),
    },
    {
      accessorKey: "product.name",
      header: "Product / Category",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">
            {row.original.product?.category?.name || "General Category"}
          </span>
          <Link
            href={`/products/${row.original.productId || row.original.product?.id || 1}`}
            className="font-semibold text-primary hover:underline"
          >
            {row.original.product?.name ||
              row.original.name ||
              `Combination #${row.original.id}`}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: () => <div className="text-right">SRP Price</div>,
      cell: ({ row }) => {
        const price = Number(row.original.price || 0);
        const avgCost = Number(row.original.inventory?.averagePrice || 0);
        const isLoss = price > 0 && avgCost >= price;
        return (
          <div
            className={`text-right font-mono font-bold ${isLoss ? "text-rose-600" : "text-foreground"}`}
          >
            ₱{price.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: "inventory.averagePrice",
      header: () => <div className="text-right">Average Cost</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono text-xs text-muted-foreground">
          ₱{Number(row.original.inventory?.averagePrice || 0).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: "inventory.quantity",
      header: () => <div className="text-right">Stock Quantity</div>,
      cell: ({ row }) => {
        const qty = Number(row.original.inventory?.quantity || 0);
        return (
          <div
            className={`text-right font-mono font-bold ${qty === 0 ? "text-rose-600" : "text-emerald-600"}`}
          >
            {qty}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 ">
      <PageHeader
        title="Product Search"
        description="Search across products and inventory combinations."
      />

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search product name, SKU, or unit..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 pr-10 h-14 text-lg"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={results} />
        </CardContent>
      </Card>
    </div>
  );
}
