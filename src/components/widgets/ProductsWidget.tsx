"use client";

import { DataTable } from "@/components/common/DataTable";
import ProductModal from "@/components/modals/ProductModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductData } from "@/schemas";
import { useUIStore } from "@/stores/uiStore";
import { UserRole } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { Package, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { RoleGuard } from "../common/RoleGuard";
import PageHeader from "../layout/PageHeader";

const columnHelper = createColumnHelper<ProductData>();

export default function ProductsWidget({
  initialProducts,
}: {
  initialProducts: ProductData[];
}) {
  const products = initialProducts;
  const { setProductModalOpen } = useUIStore();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: (info) => (
          <Link
            href={`/products/${info.row.original.id}`}
            className="font-semibold"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor("sku", {
        header: "SKU",
        cell: (info) => (
          <span className="font-mono text-xs font-semibold">
            {info.getValue() || `PROD-${info.row.original.id}`}
          </span>
        ),
      }),
      columnHelper.accessor("category.name", {
        header: "Category",
        cell: (info) => info.getValue() || "Uncategorized",
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Stock"
        description="Catalog inventory items, SKU barcoding, unit prices, and live stock balances."
      >
        <div className="flex gap-2 items-center">
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
            <Button
              onClick={() => setProductModalOpen(true)}
              className="bg-primary text-white gap-2"
            >
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </RoleGuard>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Product Inventory ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={products} searchKey="name" />
        </CardContent>
      </Card>

      <ProductModal />
    </div>
  );
}
