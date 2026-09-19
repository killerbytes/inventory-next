"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/common/DataTable";
import ColorBadge from "@/components/common/ColorBadge";
import AddInvoicePaymentModal from "@/components/modals/AddInvoicePaymentModal";
import { createColumnHelper } from "@tanstack/react-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { INVOICE_STATUS, STATUS_COLOR } from "@/types/definitions";

const columnHelper = createColumnHelper<any>();

interface InvoiceDetailClientWidgetProps {
  invoice: any;
}

export default function InvoiceDetailClientWidget({
  invoice,
}: InvoiceDetailClientWidgetProps) {
  const router = useRouter();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  if (!invoice) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold">Invoice Not Found</h2>
        <Button className="mt-4" onClick={() => router.push("/invoices")}>
          Return to Invoices
        </Button>
      </div>
    );
  }

  const lines = invoice.invoiceLines || [];
  const applications = invoice.applications || [];

  const totalAmount = Number(invoice.totalAmount || 0);
  const totalPaid = applications.reduce(
    (sum: number, app: any) => sum + Number(app.amountApplied || 0),
    0
  );
  const remainingBalance = Math.max(0, totalAmount - totalPaid);

  const isDraft = invoice.status === INVOICE_STATUS.DRAFT;
  const isFullyPaid = remainingBalance <= 0 || invoice.status === INVOICE_STATUS.PAID;

  const lineColumns = useMemo(
    () => [
      columnHelper.display({
        id: "reference",
        header: "Good Receipt Reference",
        cell: ({ row }) => {
          const gr = row.original.goodReceipt;
          if (!gr) return <span className="font-mono text-muted-foreground">—</span>;
          return (
            <Link
              href={`/good-receipts/${gr.id}`}
              className="font-mono font-semibold text-primary hover:underline"
            >
              {gr.referenceNo || `GR-${gr.id}`}
            </Link>
          );
        },
      }),
      columnHelper.display({
        id: "receiptDate",
        header: "Receipt Date",
        cell: ({ row }) => {
          const gr = row.original.goodReceipt;
          return (
            <span className="text-muted-foreground text-xs">
              {gr?.receiptDate ? formatDate(gr.receiptDate) : "—"}
            </span>
          );
        },
      }),
      columnHelper.accessor("amount", {
        header: () => <div className="text-right">Line Amount</div>,
        meta: {
          headerClassName: "text-right",
          className: "text-right",
        },
        cell: ({ row }) => (
          <div className="text-right font-mono font-semibold">
            {formatCurrency(Number(row.original.amount || 0))}
          </div>
        ),
      }),
    ],
    []
  );

  const paymentColumns = useMemo(
    () => [
      columnHelper.display({
        id: "paymentRef",
        header: "Payment Ref",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">
            {row.original.payment?.referenceNo || `PAY-${row.original.paymentId}`}
          </span>
        ),
      }),
      columnHelper.display({
        id: "paymentDate",
        header: "Payment Date",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.payment?.paymentDate
              ? formatDate(row.original.payment.paymentDate)
              : "—"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "recordedBy",
        header: "Recorded By",
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.payment?.user?.username ||
              row.original.payment?.user?.name ||
              "System"}
          </span>
        ),
      }),
      columnHelper.accessor("amountApplied", {
        header: () => <div className="text-right">Amount Applied</div>,
        meta: {
          headerClassName: "text-right",
          className: "text-right",
        },
        cell: ({ row }) => (
          <div className="text-right font-mono font-semibold text-emerald-600">
            {formatCurrency(Number(row.original.amountApplied || 0))}
          </div>
        ),
      }),
      columnHelper.accessor("amountRemaining", {
        header: () => <div className="text-right">Amount Remaining</div>,
        meta: {
          headerClassName: "text-right",
          className: "text-right",
        },
        cell: ({ row }) => (
          <div className="text-right font-mono font-medium text-muted-foreground">
            {formatCurrency(Number(row.original.amountRemaining || 0))}
          </div>
        ),
      }),
    ],
    []
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/invoices")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {invoice.invoiceNumber || `Invoice #${invoice.id}`}
              </h1>
              <ColorBadge colorMap={STATUS_COLOR}>
                {invoice.status || INVOICE_STATUS.DRAFT}
              </ColorBadge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {invoice.supplier ? (
                  <Link
                    href={`/suppliers/${invoice.supplier.id}`}
                    className="text-primary hover:underline"
                  >
                    {invoice.supplier.name}
                  </Link>
                ) : (
                  "Direct Supplier"
                )}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Due: {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
              </span>
            </div>
          </div>
        </div>

        {!isDraft && !isFullyPaid && (
          <Button onClick={() => setPaymentModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Payment
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Total Invoice Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatCurrency(totalAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-emerald-700">
              Amount Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {formatCurrency(totalPaid)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-rose-700">
              Remaining Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold font-mono ${
                remainingBalance > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {formatCurrency(remainingBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {invoice.notes && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 pb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Invoice Notes
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {invoice.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details & Payment Tabs */}
      <Tabs defaultValue="lines" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="lines">
            Shipment Lines ({lines.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({applications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lines">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={lineColumns}
                data={lines}
                paginate={false}
                renderFooter={(rows: any[]) => (
                  <tr className="border-t font-semibold bg-muted/50">
                    <td colSpan={2} className="p-3 text-right">
                      Total Amount:
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-base text-primary">
                      {formatCurrency(
                        rows.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
                      )}
                    </td>
                  </tr>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment Applications History</CardTitle>
              {!isDraft && !isFullyPaid && (
                <Button size="sm" onClick={() => setPaymentModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Payment
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments recorded for this invoice yet.
                </div>
              ) : (
                <DataTable
                  columns={paymentColumns}
                  data={applications}
                  paginate={false}
                  renderFooter={(rows: any[]) => (
                    <tr className="border-t font-semibold bg-muted/50">
                      <td colSpan={3} className="p-3 text-right">
                        Total Applied:
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(
                          rows.reduce(
                            (acc, curr) => acc + Number(curr.amountApplied || 0),
                            0
                          )
                        )}
                      </td>
                      <td></td>
                    </tr>
                  )}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {paymentModalOpen && (
        <AddInvoicePaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          invoice={invoice}
          remainingBalance={remainingBalance}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
