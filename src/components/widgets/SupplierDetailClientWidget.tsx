"use client";

import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { SupplierData } from "@/schemas";
import { createColumnHelper } from "@tanstack/react-table";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

const columnHelper = createColumnHelper<any>();

interface SupplierDetailClientWidgetProps {
  supplier: SupplierData;
  receipts: any[];
}

export default function SupplierDetailClientWidget({
  supplier,
  receipts = [],
}: SupplierDetailClientWidgetProps) {
  const router = useRouter();

  const columns = useMemo(
    () => [
      columnHelper.accessor("referenceNo", {
        header: "Reference No",
        cell: ({ row }) => (
          <Link
            href={`/good-receipts/${row.original.id}`}
            className="font-mono font-semibold text-primary hover:underline"
          >
            {row.original.referenceNo || `GR-${row.original.id}`}
          </Link>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status || "COMPLETED";
          const variant =
            s === "COMPLETED"
              ? "success"
              : s === "CANCELLED"
                ? "destructive"
                : "warning";
          return <Badge variant={variant as any}>{s}</Badge>;
        },
      }),
      columnHelper.accessor("receiptDate", {
        header: "Receipt Date",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.receiptDate
              ? new Date(row.original.receiptDate).toLocaleDateString()
              : "—"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "itemsCount",
        header: "Item Count",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {(row.original.goodReceiptLines || row.original.lines || []).length}{" "}
            items
          </span>
        ),
      }),
      columnHelper.accessor("totalAmount", {
        header: () => <div className="text-right">Total Amount</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono font-semibold">
            {formatCurrency(Number(row.original.totalAmount || 0))}
          </div>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/suppliers")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
          <p className="text-muted-foreground text-sm">
            Vendor details, active purchase orders, and shipment history
          </p>
        </div>
      </div>

      {/* Supplier Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Building2 className="h-5 w-5 text-cyan-600" />
            Vendor Contact Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="flex items-start gap-3">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-xs text-muted-foreground block">Phone</span>
              <p className="font-medium font-mono">
                {supplier.phone || "Not specified"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-xs text-muted-foreground block">Email</span>
              <p className="font-medium">{supplier.email || "Not specified"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-xs text-muted-foreground block">
                Office / Warehouse Address
              </span>
              <p className="font-medium">
                {supplier.address || "Not specified"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Total Good Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {receipts.length} Shipments
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-emerald-700">
              Total Delivered Goods Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {/* {formatCurrency(totalDeliveredValue)} */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipment History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-indigo-600" />
            Shipment Receipts History ({receipts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={receipts} paginate={false} />
        </CardContent>
      </Card>
    </div>
  );
}
