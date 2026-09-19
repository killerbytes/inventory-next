"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import ReturnTransactionsTable from "@/components/common/ReturnTransactionsTable";
import PageHeader from "@/components/layout/PageHeader";
import CancelModal from "@/components/modals/CancelModal";
import DeliveryDetailsModal from "@/components/modals/DeliveryDetailsModal";
import ReturnExchangeModal from "@/components/modals/ReturnExchangeModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { SalesOrderData } from "@/schemas";
import { cancelSalesOrderAction } from "@/server/actions/salesOrder.actions";
import { ORDER_STATUS, STATUS_COLOR, UNIT_COLOR } from "@/types/definitions";
import { createColumnHelper, RowSelectionState } from "@tanstack/react-table";
import { cx } from "class-variance-authority";
import { AlertCircle, Ban, Car, EllipsisVertical, Undo } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const columnHelper = createColumnHelper<any>();

interface SalesOrderDetailClientWidgetProps {
  data: SalesOrderData;
}

export default function SalesOrderDetailClientWidget({
  data,
}: SalesOrderDetailClientWidgetProps) {
  const router = useRouter();
  const [returnEnabled, setReturnEnabled] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  if (!data) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold">Sales Order Not Found</h2>
        <Button className="mt-4" onClick={() => router.push("/sales-orders")}>
          Return to Sales Orders
        </Button>
      </div>
    );
  }

  const items = data.salesOrderItems || [];

  const selectedReturns = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => {
        const i = items[Number(key)];
        if (!i) return null;
        return i;
      })
      .filter(Boolean);
  }, [rowSelection, items]);

  const totalReturnAmount =
    data.returnTransactions?.reduce(
      (acc: number, item: any) => acc + Number(item.totalReturnAmount || 0),
      0,
    ) || 0;

  const totalExchangeAmount =
    data.returnTransactions?.reduce(
      (acc: number, item: any) => acc + Number(item.totalExchangeAmount || 0),
      0,
    ) || 0;

  const grandTotal =
    Number(data.totalAmount || 0) - totalReturnAmount + totalExchangeAmount;

  const handleCancelOrder = async (reason: string) => {
    try {
      await cancelSalesOrderAction(Number(data.id), reason);
      toast.success("Sales Order cancelled successfully");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel sales order");
    }
  };

  const columns = useMemo(
    () => [
      ...(returnEnabled
        ? [
            columnHelper.display({
              id: "select",
              header: ({ table }: any) => (
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                  }
                  onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                  }
                  aria-label="Select all"
                />
              ),
              cell: ({ row }: any) => (
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
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
      }),
      columnHelper.accessor("quantity", {
        header: () => "Quantity",
        meta: {
          align: "right",
        },
        cell: ({ row }) => Number(row.original.quantity),
      }),
      columnHelper.accessor("nameSnapshot", {
        header: "Product",
        meta: {
          className: "flex items-center gap-2",
        },
        cell: ({ row }) => {
          const productId =
            row.original.combinations?.productId || row.original.productId;
          const name =
            row.original.nameSnapshot || row.original.combinations?.name;

          return (
            <>
              <ColorBadge colorMap={UNIT_COLOR}>
                {String(row.original.unit || "PCS")}
              </ColorBadge>

              <Link
                href={`/products/${productId}`}
                className={cx("text-primary", `font-medium hover:underline`)}
              >
                {name}
              </Link>
            </>
          );
        },
      }),
      columnHelper.accessor("purchasePrice", {
        header: () => "Price",
        meta: {
          align: "right",
        },
        cell: ({ row }) => formatCurrency(row.original.purchasePrice),
      }),
      columnHelper.accessor("discount", {
        header: () => "Discount",
        meta: {
          align: "right",
        },
        cell: ({ row }) => formatCurrency(row.original.discount),
      }),
      columnHelper.accessor("discountNote", {
        header: "Note",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.discountNote || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("totalAmount", {
        header: () => "Amount",
        meta: {
          align: "right",
          className: "font-bold text-emerald-600",
        },
        cell: ({ row }) => formatCurrency(row.original.totalAmount),
      }),
    ],
    [returnEnabled],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sales Order #${data.salesOrderNumber}`}
        description="Customer sales order details, line items, and fulfillment ledger."
      >
        <div className="flex items-center gap-2">
          <ColorBadge colorMap={STATUS_COLOR}>
            {String(data.status || "POSTED")}
          </ColorBadge>

          {data.status !== ORDER_STATUS.VOID && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md border border-input bg-background h-9 w-9 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <EllipsisVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsDeliveryModalOpen(true)}>
                  <Car className="h-4 w-4 mr-2" />
                  Delivery Details
                </DropdownMenuItem>

                {(data.status === ORDER_STATUS.RECEIVED ||
                  data.status === ORDER_STATUS.COMPLETED ||
                  data.status === "POSTED") && (
                  <>
                    <DropdownMenuItem
                      className="text-rose-600 focus:text-rose-600"
                      onClick={() => setIsCancelModalOpen(true)}
                    >
                      <Ban className="h-4 w-4 mr-2 text-rose-600" />
                      Cancel Order
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setReturnEnabled(!returnEnabled)}
                    >
                      <Undo className="h-4 w-4 mr-2" />
                      Return/Exchange
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </PageHeader>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 justify-between">
            <div>
              <Label className="text-muted-foreground text-xs uppercase font-semibold">
                Order Date
              </Label>
              <div className="font-semibold text-sm mt-1">
                {data.orderDate
                  ? new Date(data.orderDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "-"}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase font-semibold">
                Customer
              </Label>
              <div className="font-semibold text-sm mt-1">
                {data.customer?.name || "Cash Customer"}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs uppercase font-semibold">
                Mode of Payment
              </Label>
              <div className="font-semibold text-sm mt-1">
                {data.modeOfPayment || "CASH"}
              </div>
            </div>
          </div>

          {data.notes && (
            <div className="mt-4 pt-3 border-t">
              <Label className="text-muted-foreground text-xs uppercase font-semibold">
                Notes
              </Label>
              <div className="text-sm mt-0.5">{data.notes}</div>
            </div>
          )}

          {data.internalNotes && (
            <div className="mt-3 pt-3 border-t">
              <Label className="text-muted-foreground text-xs uppercase font-semibold">
                Internal Notes
              </Label>
              <div className="text-sm mt-0.5 text-amber-700 dark:text-amber-400">
                {data.internalNotes}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {data.status === ORDER_STATUS.CANCELLED && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cancellation Reason</AlertTitle>
          <AlertDescription>
            {data.cancellationReason || "No cancellation reason provided."}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <DataTable
          data={items}
          columns={columns}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />

        {returnEnabled && (
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={selectedReturns.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setIsReturnModalOpen(true)}
            >
              Returns/Exchange ({selectedReturns.length})
            </Button>
          </div>
        )}
      </div>

      {data.returnTransactions && data.returnTransactions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">
            Return & Exchange History
          </h3>
          <ReturnTransactionsTable data={data.returnTransactions} />
        </div>
      )}

      <div className="md:w-1/3 flex ml-auto">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-semibold text-muted-foreground">
                Sale Amount
              </TableCell>
              <TableHead className="text-right">
                {formatCurrency(data.totalAmount)}
              </TableHead>
            </TableRow>

            {totalReturnAmount > 0 && (
              <TableRow>
                <TableCell className="text-muted-foreground">
                  Total Returns
                </TableCell>
                <TableHead className="text-right text-red-500">
                  -{formatCurrency(totalReturnAmount)}
                </TableHead>
              </TableRow>
            )}

            {totalExchangeAmount > 0 && (
              <TableRow>
                <TableCell className="text-muted-foreground">
                  Total Exchanges
                </TableCell>
                <TableHead className="text-right">
                  {formatCurrency(totalExchangeAmount)}
                </TableHead>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell
                colSpan={1}
                className="font-bold text-muted-foreground"
              >
                Grand Total
              </TableCell>
              <TableCell className="text-right font-bold text-base text-emerald-600">
                {formatCurrency(grandTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <DeliveryDetailsModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
        data={data}
      />

      <CancelModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        orderId={Number(data.id)}
        onConfirm={handleCancelOrder}
      />

      <ReturnExchangeModal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setReturnEnabled(false);
          router.refresh();
        }}
        referenceId={Number(data.id)}
        returns={selectedReturns}
        salesOrder={true}
      />
    </div>
  );
}
