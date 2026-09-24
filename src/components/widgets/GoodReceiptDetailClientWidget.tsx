"use client";

import { DataTable } from "@/components/common/DataTable";
import ReturnExchangeModal from "@/components/modals/ReturnExchangeModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/rbac";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { GoodReceiptData } from "@/schemas";
import {
  cancelGoodReceiptAction,
  updateGoodReceiptAction,
} from "@/server/actions/goodReceipt.actions";
import { useUIStore } from "@/stores/uiStore";
import { ORDER_STATUS, STATUS_COLOR, UNIT_COLOR } from "@/types/definitions";
import { createColumnHelper, RowSelectionState } from "@tanstack/react-table";
import { ArrowLeft, Building2, CheckCircle2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import ColorBadge from "../common/ColorBadge";
import PermissionGuard from "../common/PermissionGuard";
import ReturnTransactionsTable from "../common/ReturnTransactionsTable";
import { Checkbox } from "../ui/checkbox";

const columnHelper = createColumnHelper<any>();

export default function GoodReceiptDetailClientWidget({
  initialReceipt: receipt,
}: {
  initialReceipt: GoodReceiptData;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(receipt?.status || "COMPLETED");
  const { setReturnExchangeModalOpen } = useUIStore();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const selectedReturns = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => {
        const i =
          receipt.goodReceiptLines && receipt.goodReceiptLines[Number(key)];
        if (!i) return null;
        const { combination, ...rest } = i;
        return rest;
      })
      .filter(Boolean);
  }, [rowSelection, receipt.goodReceiptLines]);

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      if (newStatus === "CANCELLED") {
        await cancelGoodReceiptAction(Number(receipt.id));
      } else {
        await updateGoodReceiptAction(Number(receipt.id), {
          status: newStatus,
        });
      }
      setStatus(newStatus);
      toast.success(`Good Receipt status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update receipt status");
    }
  };

  const columns = useMemo(
    () => [
      ...(true
        ? [
            columnHelper.display({
              id: "select",
              meta: { className: "w-auto" },
              header: ({ table }) => (
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                  }
                  onCheckedChange={(value) => {
                    table.toggleAllPageRowsSelected(!!value);
                  }}
                  aria-label="Select all"
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Select row"
                />
              ),
            }),
          ]
        : []),

      columnHelper.display({
        id: "itemName",
        header: "Product Name",
        meta: { className: "w-2/4 min-w-[400px]" },
        cell: ({ row }) => (
          <div className="flex gap-2">
            <ColorBadge colorMap={UNIT_COLOR}>{row.original.unit}</ColorBadge>
            <Link
              href={`/products/${row.original.productId}`}
              className="text-primary"
            >
              {row.original.nameSnapshot}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor("discount", {
        header: "Discount",
        meta: {
          align: "right",
        },
        cell: (value) => formatCurrency(value.getValue()),
      }),
      columnHelper.accessor("discountNote", {
        header: "Discount Note",
        meta: {
          className: "text-xs",
        },
      }),
      columnHelper.accessor("quantity", {
        header: "Qty",
        meta: {
          align: "right",
        },
        cell: (value) => Number(value.getValue()),
      }),
      columnHelper.accessor("purchasePrice", {
        header: "Unit Cost",
        meta: {
          align: "right",
        },
        cell: (value) => formatCurrency(value.getValue()),
      }),
      columnHelper.display({
        id: "averagePrice",
        header: "Average Price",
        meta: {
          align: "right",
        },
        cell: ({ row }) => {
          const { quantity, purchasePrice, discount } = row.original;
          const priceAfterDiscount =
            (quantity * purchasePrice - (discount ?? 0)) / quantity;
          return formatCurrency(priceAfterDiscount);
        },
      }),
      columnHelper.accessor("totalAmount", {
        header: "Total",
        meta: {
          align: "right",
        },
        cell: (value) => formatCurrency(value.getValue()),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {receipt.referenceNo || `Receipt #${receipt.id}`}
              </h1>
              <ColorBadge colorMap={STATUS_COLOR}>{status}</ColorBadge>
            </div>
            <p className="text-muted-foreground text-sm">
              Goods Receipt Details
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status !== ORDER_STATUS.DRAFT && status !== ORDER_STATUS.VOID && (
            <PermissionGuard permission={PERMISSIONS.RETURN_GOODS}>
              <Button
                variant="outline"
                disabled={selectedReturns.length === 0}
                onClick={() => setReturnExchangeModalOpen(true)}
              >
                <Undo2 className="h-4 w-4" /> Return to Supplier
              </Button>
            </PermissionGuard>
          )}
          {/* TODO: Uncomment when we have a proper CANCEL_GOODS permission */}
          {/* {status !== "CANCELLED" && (
            <PermissionGuard permission={PERMISSIONS.CANCEL_GOODS}>
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => handleUpdateStatus("CANCELLED")}
              >
                <XCircle className="h-4 w-4" /> Cancel Receipt
              </Button>
            </PermissionGuard>
          )} */}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-cyan-600" />
            <div>
              <p className="font-semibold">
                {receipt.supplier?.name || "Direct Supplier"}
              </p>
              <p className="text-xs text-muted-foreground">
                Ref: {receipt.referenceNo || `GR-${receipt.id}`}
              </p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Receipt Date:</span>
              <span className="font-semibold">
                {formatDateTime(receipt.receiptDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Internal Notes:</span>
              <span className="font-semibold">
                {receipt.internalNotes ?? "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={receipt.goodReceiptLines}
            paginate={false}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />

          <div className="mt-4 text-right">
            <span className="text-sm text-muted-foreground">Grand Total:</span>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(receipt.totalAmount)}
            </div>
          </div>
        </CardContent>
        {status !== ORDER_STATUS.RECEIVED && (
          <CardFooter className="justify-end">
            <PermissionGuard permission={PERMISSIONS.MANAGE_GOODS}>
              <Button
                className="bg-orange-600"
                onClick={() => handleUpdateStatus(ORDER_STATUS.RECEIVED)}
              >
                <CheckCircle2 className="h-4 w-4" /> Receive Order
              </Button>
            </PermissionGuard>
          </CardFooter>
        )}
      </Card>

      {receipt.returnTransactions && receipt.returnTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Return Transactions</CardTitle>
            <CardAction className="flex items-center gap-2">
              <span>Total Returns:</span>
              <span className="font-bold text-destructive text-lg">
                {formatCurrency(
                  receipt.returnTransactions.reduce(
                    (total, returnItem) =>
                      total + Number(returnItem.totalReturnAmount),
                    0,
                  ),
                )}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent>
            <ReturnTransactionsTable data={receipt.returnTransactions} />
          </CardContent>
        </Card>
      )}

      <ReturnExchangeModal
        referenceId={Number(receipt.id)}
        returns={selectedReturns}
        salesOrder={false}
      />
    </div>
  );
}
