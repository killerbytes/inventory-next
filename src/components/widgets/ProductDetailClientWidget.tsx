"use client";

import { DataTable } from "@/components/common/DataTable";
import PageHeader from "@/components/layout/PageHeader";
import BarcodePrinterModal from "@/components/modals/BarcodePrinterModal";
import BreakPackModal from "@/components/modals/BreakPackModal";
import CombinationModal from "@/components/modals/CombinationModal";
import StockAdjustmentModal from "@/components/modals/StockAdjustmentModal";
import VariantsModal from "@/components/modals/VariantsModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSIONS } from "@/lib/rbac";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  groupSubItems,
} from "@/lib/utils";
import { ProductData } from "@/schemas";
import { useUIStore } from "@/stores/uiStore";
import { INVENTORY_MOVEMENT_TYPE_COLOR, UNIT_COLOR } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Activity,
  Boxes,
  ClipboardList,
  CornerDownRight,
  History,
  Layers,
  PackageOpen,
  Pencil,
  Printer,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useMemo, useState } from "react";
import ColorBadge from "../common/ColorBadge";
import { PermissionGuard } from "../common/PermissionGuard";
import ShowMore from "../common/ShowMore";
import ProductModal from "../modals/ProductModal";

interface ProductDetailClientWidgetProps {
  product: ProductData;
  supplierHistory?: any[];
  priceHistory?: any[];
  movements?: any[];
}

const columnHelper = createColumnHelper<any>();

const VALID_TABS = [
  "combinations",
  "price_history",
  "supplier_history",
  "movements",
] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function ProductDetailClientWidget({
  product,
  supplierHistory = [],
  priceHistory = [],
  movements = [],
}: ProductDetailClientWidgetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    setCombinationModalOpen,
    setProductModalOpen,
    setBreakPackModalOpen,
    setStockAdjustmentModalOpen,
  } = useUIStore();

  const activeTab = useMemo(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam && (VALID_TABS as readonly string[]).includes(tabParam)) {
      return tabParam as TabValue;
    }
    return "combinations";
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (value === "combinations") {
        params.delete("tab");
      } else {
        params.set("tab", value);
      }
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, pathname, router],
  );
  const { setVariantModalOpen, setBarcodePrinterModalOpen } = useUIStore();
  const [filterCombinationId, setFilterCombinationId] = useState<string>("ALL");

  const combinations = React.useMemo(() => {
    return groupSubItems(product.combinations);
  }, [product.combinations]);

  const filteredPriceHistory = useMemo(() => {
    if (filterCombinationId === "ALL") return priceHistory;
    return priceHistory.filter(
      (item: any) =>
        String(item.combinations?.id) === String(filterCombinationId),
    );
  }, [priceHistory, filterCombinationId]);

  const filteredSupplierHistory = useMemo(() => {
    if (filterCombinationId === "ALL") return supplierHistory;
    return supplierHistory.filter(
      (item: any) =>
        String(item.combinations?.id) === String(filterCombinationId),
    );
  }, [supplierHistory, filterCombinationId]);

  const filteredMovements = useMemo(() => {
    if (filterCombinationId === "ALL") return movements;
    return movements.filter(
      (item: any) =>
        String(item.combinationId || item.combination?.id) ===
        String(filterCombinationId),
    );
  }, [movements, filterCombinationId]);

  const combinationColumns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        meta: { className: "w-2/4 min-w-[200px]" },
        cell: (info) => {
          const unit = info.row.original.unit;
          return (
            <div
              style={{
                paddingLeft: `${info.row.depth}rem`,
              }}
              className="flex gap-2 items-center"
            >
              {info.row.depth > 0 && <CornerDownRight />}
              <ColorBadge colorMap={UNIT_COLOR}>{unit}</ColorBadge>
              {info.row.original.name}
            </div>
          );
        },
      }),
      columnHelper.accessor("price", {
        header: "SRP Price",
        meta: {
          align: "right",
          className: "font-mono font-semibold",
        },
        cell: (info) => formatCurrency(info.getValue() || 0),
      }),
      columnHelper.accessor((row) => row.inventory?.averagePrice, {
        id: "averagePrice",
        header: "Average Price",
        meta: {
          align: "right",
          className: "font-mono",
        },
        cell: (info) => formatCurrency(info.getValue() || 0),
      }),
      columnHelper.accessor((row) => row.inventory?.quantity, {
        id: "quantity",
        header: "Qty",
        meta: {
          align: "right",
        },
        cell: (info) => <Badge>{Number(info.getValue() || 0)}</Badge>,
      }),
      columnHelper.accessor("conversionFactor", {
        header: "Conversion Factor",
        meta: {
          align: "right",
        },
        cell: (info) => Number(info.getValue() || 1),
      }),
      columnHelper.display({
        header: "Actions",
        meta: { className: "w-1/8 min-w-[80px]", align: "right" },
        cell: (info) => {
          const rowOriginal = info.row.original;
          const qty = Number(rowOriginal.inventory?.quantity || 0);
          return (
            <div className="flex gap-2 justify-end">
              <PermissionGuard
                permission={PERMISSIONS.MANAGE_STOCK_ADJUSTMENTS}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setStockAdjustmentModalOpen(true, rowOriginal);
                  }}
                >
                  <ClipboardList className="h-4 w-4" />
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.MANAGE_BREAKPACKS}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={qty === 0}
                  onClick={() => {
                    setBreakPackModalOpen(true, rowOriginal);
                  }}
                >
                  <PackageOpen className="h-4 w-4" />
                </Button>
              </PermissionGuard>
            </div>
          );
        },
      }),
    ],
    [],
  );

  const priceHistoryColumns = useMemo(
    () => [
      columnHelper.accessor("combination.name", {
        header: "Name",
        meta: { className: "w-2/4 min-w-[180px]" },
        cell: (info) => {
          const combo = info.row.original.combination;
          return (
            <div className="flex gap-2 items-center">
              <ColorBadge colorMap={UNIT_COLOR}>
                {String(combo?.unit)}
              </ColorBadge>
              <span>{combo?.name}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("fromPrice", {
        header: "From",
        meta: {
          className: "font-mono",
        },
        cell: (info) => formatCurrency(info.getValue() || 0),
      }),
      columnHelper.accessor("toPrice", {
        header: "To",
        meta: {
          className: "font-mono font-semibold",
        },
        cell: (info) => {
          const from = Number(info.row.original.fromPrice || 0);
          const to = Number(info.getValue() || 0);
          const isIncrease = to >= from;
          return (
            <span className={isIncrease ? "text-emerald-600" : "text-rose-600"}>
              {formatCurrency(to)}
            </span>
          );
        },
      }),
      columnHelper.accessor("changedAt", {
        header: "Changed Date",
        meta: {
          className: "text-xs text-muted-foreground",
        },

        cell: (info) => formatDateTime(info.getValue()),
      }),
      columnHelper.accessor("user", {
        header: "User",
        cell: (info) => info.row.original.user?.username,
      }),
    ],
    [],
  );

  const supplierHistoryColumns = useMemo(
    () => [
      columnHelper.accessor("combination.name", {
        header: "Name",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <ColorBadge colorMap={UNIT_COLOR}>
              {String(row.original.combination?.unit)}
            </ColorBadge>
            {row.original.combination?.name}
          </div>
        ),
      }),
      columnHelper.accessor("quantity", {
        header: "Quantity",
        cell: (info) => <Badge>{Number(info.getValue() || 0)}</Badge>,
      }),
      columnHelper.accessor("purchasePrice", {
        header: "Purchase Price",
        meta: {
          className: "font-mono",
        },
        cell: (info) => formatCurrency(info.getValue() || 0),
      }),
      columnHelper.accessor("goodReceipt.supplier.name", {
        header: "Supplier",
        cell: (info) => {
          const supplier = info.row.original.goodReceipt?.supplier;
          return supplier ? (
            <Link
              href={`/suppliers/${supplier.id}`}
              className="text-primary hover:underline font-medium"
            >
              {supplier.name}
            </Link>
          ) : (
            "N/A"
          );
        },
      }),
      columnHelper.accessor("goodReceipt.id", {
        header: "Good Receipt",
        cell: (info) => {
          const grId = info.row.original.goodReceipt?.id;
          return grId ? (
            <Link
              href={`/good-receipts/${grId}`}
              className="text-primary hover:underline font-mono font-medium"
            >
              GR-{grId}
            </Link>
          ) : (
            "N/A"
          );
        },
      }),
      columnHelper.accessor("goodReceipt.receiptDate", {
        header: "Date",
        meta: {
          className: "text-xs text-muted-foreground",
        },
        cell: (info) => formatDate(info.row.original.goodReceipt?.receiptDate),
      }),
    ],
    [],
  );

  const movementsColumns = useMemo(
    () => [
      columnHelper.accessor("combination.name", {
        header: "Product",
        cell: (info) => {
          const combo = info.row.original.combination;
          return (
            <div className="flex gap-2 items-center">
              <ColorBadge colorMap={UNIT_COLOR}>
                {String(combo?.unit || "PCS")}
              </ColorBadge>
              <span>{combo?.name || product.name}</span>
            </div>
          );
        },
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => (
          <ColorBadge colorMap={INVENTORY_MOVEMENT_TYPE_COLOR}>
            {info.getValue() || "ADJUSTMENT"}
          </ColorBadge>
        ),
      }),
      columnHelper.accessor("quantity", {
        header: "Quantity",
        cell: (info) => <Badge>{Number(info.getValue() || 0)}</Badge>,
      }),
      columnHelper.accessor("costPerUnit", {
        header: "Cost Per Unit",
        meta: {
          className: "font-mono",
        },
        cell: (info) => formatCurrency(info.getValue() || 0),
      }),
      columnHelper.accessor("totalCost", {
        header: "Total Cost",
        meta: {
          className: "font-mono",
        },
        cell: (info) => formatCurrency(info.getValue() || 0),
      }),
      columnHelper.accessor("referenceId", {
        header: "Reference",
        cell: (info) => {
          const type = info.row.original.referenceType;
          const refId = info.row.original.referenceId;
          if (!refId) return "N/A";

          let route = "/good-receipts";
          if (type === "SALES_ORDER") route = "/sales-orders";

          return (
            <Link
              href={`${route}/${refId}`}
              className="text-primary hover:underline font-mono text-xs"
            >
              {type || "REF"}:{refId}
            </Link>
          );
        },
      }),
      columnHelper.accessor("referenceDate", {
        header: "Reference Date",
        meta: {
          className: "text-xs text-muted-foreground",
        },

        cell: (info) => formatDate(info.getValue()),
      }),
      columnHelper.accessor("user", {
        header: "User",
        cell: (info) =>
          info.row.original.user?.username ||
          info.row.original.user?.name ||
          "System",
      }),
    ],
    [product.name],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex gap-2 items-center">
            <ColorBadge colorMap={UNIT_COLOR}>{product.baseUnit}</ColorBadge>
            {product.name}
          </div>
        }
        description={
          <div className="flex flex-col gap-1">
            {product.description && (
              <span>Description: {product.description}</span>
            )}
            <span>Category: {product.category?.name}</span>
          </div>
        }
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setProductModalOpen(true)}
        >
          <Pencil />
        </Button>

        <Button
          variant="outline"
          onClick={() => setBarcodePrinterModalOpen(true)}
        >
          <Printer /> Print Barcodes
        </Button>
      </PageHeader>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Variant Types</CardTitle>
          <CardAction>
            <PermissionGuard permission={PERMISSIONS.MANAGE_VARIANTS}>
              <Button
                onClick={() => setVariantModalOpen(true)}
                type="button"
                variant="secondary"
              >
                <Pencil /> Edit Variants
              </Button>
            </PermissionGuard>
          </CardAction>
        </CardHeader>
        <CardContent>
          {!product.variants || product.variants.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No variant types defined for this item.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {product.variants.map((variant: any) => (
                <div
                  key={variant.id || variant.name}
                  className="space-y-1.5 rounded-lg border p-3 bg-card/50"
                >
                  <div className="uppercase text-xs font-semibold text-muted-foreground tracking-wider">
                    {variant.name}
                  </div>
                  <ShowMore>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(variant.values || []).map((v: any) => (
                        <Badge
                          key={v.id || v.value}
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {v.value}
                        </Badge>
                      ))}
                    </div>
                  </ShowMore>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="combinations">
            <Boxes /> Combinations ({combinations.length})
          </TabsTrigger>
          <TabsTrigger value="price_history">
            <History /> Price History
          </TabsTrigger>
          <TabsTrigger value="supplier_history">
            <TrendingUp /> Supplier History
          </TabsTrigger>
          <TabsTrigger value="movements">
            <Activity /> Movements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="combinations">
          <Card>
            <CardHeader>
              <CardTitle>Unit & Packaging Matrix</CardTitle>
              <CardAction>
                <PermissionGuard permission={PERMISSIONS.MANAGE_COMBINATIONS}>
                  <Button
                    onClick={() => setCombinationModalOpen(true)}
                    variant="secondary"
                  >
                    <Layers /> Manage Combinations
                  </Button>
                </PermissionGuard>
              </CardAction>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={combinationColumns}
                data={combinations}
                meta={{
                  disabledRow: { isActive: false },
                  subRows: "subItem",
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="price_history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Price Change History Log</CardTitle>
              {combinations.length > 1 && (
                <select
                  value={filterCombinationId}
                  onChange={(e) => setFilterCombinationId(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                >
                  <option value="ALL">All Combinations</option>
                  {combinations.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.unit} - {c.name}
                    </option>
                  ))}
                </select>
              )}
            </CardHeader>
            <CardContent>
              <DataTable
                columns={priceHistoryColumns}
                data={filteredPriceHistory}
                emptyMessage="No historical price changes recorded for this item."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supplier_history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Supplier Goods Receipt Log</CardTitle>
              {combinations.length > 1 && (
                <select
                  value={filterCombinationId}
                  onChange={(e) => setFilterCombinationId(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                >
                  <option value="ALL">All Combinations</option>
                  {combinations.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.unit} - {c.name}
                    </option>
                  ))}
                </select>
              )}
            </CardHeader>
            <CardContent>
              <DataTable
                columns={supplierHistoryColumns}
                data={filteredSupplierHistory}
                emptyMessage="No supplier purchase history recorded for this item."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inventory Movement & Audit Ledger</CardTitle>
              {combinations.length > 1 && (
                <select
                  value={filterCombinationId}
                  onChange={(e) => setFilterCombinationId(e.target.value)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                >
                  <option value="ALL">All Combinations</option>
                  {combinations.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.unit} - {c.name}
                    </option>
                  ))}
                </select>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <DataTable
                columns={movementsColumns}
                data={filteredMovements}
                emptyMessage="No inventory movements recorded for this item."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ProductModal />

      <VariantsModal productId={product.id} variants={product.variants || []} />
      <CombinationModal product={product} />
      <BreakPackModal product={product} />
      <StockAdjustmentModal />
      <BarcodePrinterModal combinations={product.combinations} />
    </div>
  );
}
