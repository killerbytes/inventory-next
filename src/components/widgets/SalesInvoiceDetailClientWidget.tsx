"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Ban, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ColorBadge from "@/components/common/ColorBadge";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { INVOICE_STATUS, STATUS_COLOR } from "@/constants";
import {
  postSalesInvoiceAction,
  voidSalesInvoiceAction,
} from "@/server/actions/salesInvoice.actions";
import { toast } from "sonner";
import { format } from "date-fns";

interface SalesInvoiceDetailClientWidgetProps {
  invoice: any;
}

export default function SalesInvoiceDetailClientWidget({
  invoice,
}: SalesInvoiceDetailClientWidgetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmPostOpen, setConfirmPostOpen] = React.useState(false);
  const [confirmVoidOpen, setConfirmVoidOpen] = React.useState(false);

  if (!invoice) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold">Statement Not Found</h2>
        <Button className="mt-4" onClick={() => router.push("/sales-invoices")}>
          Return to Statements
        </Button>
      </div>
    );
  }

  const customer = invoice.customer;
  const lines = invoice.salesInvoiceLines || [];

  const handlePrint = () => {
    window.print();
  };

  const handlePost = () => {
    startTransition(async () => {
      try {
        await postSalesInvoiceAction(invoice.id);
        toast.success(`Statement #${invoice.invoiceNumber} posted successfully`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to post statement");
      }
    });
  };

  const handleVoid = () => {
    startTransition(async () => {
      try {
        await voidSalesInvoiceAction(invoice.id);
        toast.success(`Statement #${invoice.invoiceNumber} has been voided`);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Failed to void statement");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Non-Printable Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/sales-invoices")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Statements
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">
              Statement #{invoice.invoiceNumber}
            </span>
            <ColorBadge colorMap={STATUS_COLOR}>
              {String(invoice.status || "DRAFT")}
            </ColorBadge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === INVOICE_STATUS.DRAFT && (
            <ConfirmDialog
              title="Post Statement"
              description="Are you sure you want to finalize and post this Statement of Account? It will transition status to POSTED."
              confirmText="Post Statement"
              onConfirm={handlePost}
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-600" />
                Post Statement
              </Button>
            </ConfirmDialog>
          )}

          {invoice.status !== "VOID" && (
            <ConfirmDialog
              title="Void Statement"
              description="Are you sure you want to void this Statement of Account? This action cannot be reversed."
              confirmText="Void Statement"
              onConfirm={handleVoid}
            >
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                className="text-rose-600 hover:text-rose-700"
              >
                <Ban className="h-4 w-4 mr-1" />
                Void Statement
              </Button>
            </ConfirmDialog>
          )}

          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-1" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Printable Statement of Account (Pixel-matched to sample PDF) */}
      <Card className="bg-white text-slate-900 border shadow-md p-8 md:p-12 max-w-[850px] mx-auto print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6">
          <div className="bg-[#4a5568] text-white px-5 py-2.5 rounded-sm font-bold text-lg tracking-wide uppercase">
            H. Concepcion Mini Hardware
          </div>
          <div className="text-right sm:self-center">
            <h1 className="text-2xl font-extrabold tracking-wider text-[#2b6cb0] uppercase">
              STATEMENT OF ACCOUNT
            </h1>
          </div>
        </div>

        {/* Bill To & Account Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 pb-6 text-sm">
          <div>
            <span className="font-bold text-slate-600 block mb-1">Bill To:</span>
            <div className="font-extrabold text-base text-slate-800">
              {customer?.name || "Walk-in / Cash Customer"}
            </div>
            {customer?.address && (
              <div className="text-slate-600 mt-1 max-w-sm whitespace-pre-line leading-relaxed">
                {customer.address}
              </div>
            )}
            {customer?.phone && (
              <div className="text-slate-600 mt-1 font-medium">
                {customer.phone}
              </div>
            )}
            {customer?.email && (
              <div className="text-slate-500 text-xs">
                {customer.email}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <div className="space-y-1 text-right mb-4">
              <div>
                <span className="font-bold text-slate-600 mr-2">Date:</span>
                <span className="font-semibold">
                  {invoice.invoiceDate
                    ? format(new Date(invoice.invoiceDate), "dd-MMM-yyyy")
                    : "-"}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-600 mr-2">Statement No:</span>
                <span className="font-semibold text-slate-800">{invoice.invoiceNumber}</span>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="w-full sm:w-64 border rounded-sm overflow-hidden text-xs bg-slate-50/50">
              <div className="flex justify-between px-3 py-1.5 border-b">
                <span className="font-bold text-slate-600">Previous Balance</span>
                <span className="font-semibold">{formatCurrency(invoice.previousBalance || 0)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 border-b">
                <span className="font-bold text-slate-600">Total Charges</span>
                <span className="font-semibold">{formatCurrency(invoice.totalCharges || 0)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5 border-b">
                <span className="font-bold text-slate-600">Total Payments</span>
                <span className="font-semibold">{formatCurrency(invoice.totalPayments || 0)}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2 bg-[#2d3748] text-white font-bold text-sm">
                <span>Amount Due</span>
                <span>{formatCurrency(invoice.amountDue || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Ledger Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#2d3748] text-white uppercase font-bold tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Ref No</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Charges</th>
                <th className="py-2.5 px-3 text-right">Payments</th>
                <th className="py-2.5 px-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    No transactions recorded on this statement.
                  </td>
                </tr>
              ) : (
                lines.map((line: any, idx: number) => {
                  const charge = Number(line.charges || 0);
                  const payment = Number(line.payments || 0);
                  const balance = Number(line.balance || 0);

                  return (
                    <tr
                      key={line.id || idx}
                      className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}
                    >
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {line.orderDate ? format(new Date(line.orderDate), "MM-dd-yy") : "-"}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {line.refNo || "-"}
                      </td>
                      <td className="py-2 px-3 text-slate-600 max-w-[200px] truncate">
                        {line.description || "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800">
                        {charge > 0 ? charge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600">
                        {payment > 0 ? payment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(balance)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Payment Notes */}
        <div className="mt-12 pt-6 border-t text-xs text-slate-700">
          <div className="font-bold uppercase tracking-wider text-slate-500 mb-1">
            Notes:
          </div>
          <div className="whitespace-pre-line font-mono bg-slate-50 p-3 rounded-sm border inline-block min-w-[280px]">
            {invoice.notes || "No additional payment instructions."}
          </div>
        </div>
      </Card>
    </div>
  );
}
