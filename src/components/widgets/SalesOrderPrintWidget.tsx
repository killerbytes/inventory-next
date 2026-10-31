"use client";

import { COMPANY_PROFILE } from "@/constants/company";
import { computeSalesOrderSummary } from "@/lib/compute";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Printer, Receipt, X } from "lucide-react";
import React, { useEffect, useState } from "react";

export type PrintFormat = "standard" | "pos";

interface SalesOrderPrintWidgetProps {
  order: any;
  autoPrint?: boolean;
}

export default function SalesOrderPrintWidget({
  order,
  autoPrint = false,
}: SalesOrderPrintWidgetProps) {
  const [format, setFormat] = useState<PrintFormat>("standard");

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  if (!order) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold">Sales Order Not Found</h2>
      </div>
    );
  }

  const summary = computeSalesOrderSummary(order);
  const customerName = order.customer?.name || "Cash Customer";
  const customerPhone = order.customer?.phone;
  const customerAddress = order.customer?.address;
  const isDelivery = Boolean(order.isDelivery);
  const isQuotation = Boolean(order.isQuotation);
  const hasDiscount =
    summary.totalDiscount > 0 ||
    (order.salesOrderItems || []).some(
      (item: any) => Number(item.discount || 0) > 0
    );

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 print:bg-white print:text-black print:min-h-0 print:w-full">
      {/* On-Screen Action Bar (Excluded during print) */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3 shadow-xs flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-slate-700">
            Print Format:
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
            <button
              type="button"
              data-testid="format-standard"
              onClick={() => setFormat("standard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${format === "standard"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Standard (A4 / Letter)
            </button>
            <button
              type="button"
              data-testid="format-pos"
              onClick={() => setFormat("pos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${format === "pos"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              Thermal POS (80mm)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="print-btn"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Print Document
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>

      {/* Printable Sheet View */}
      <main className="p-4 sm:p-8 flex justify-center print:p-0 print:block print:w-full">
        {format === "standard" ? (
          /* STANDARD A4 / LETTER LAYOUT */
          <div
            data-format="standard"
            className="w-full max-w-4xl bg-white rounded-xl shadow-md border border-slate-200 p-8 sm:p-12 print:border-none print:shadow-none print:p-0 print:max-w-none print:w-full"
          >
            {/* Header: Company & Document Identification */}
            <header className="border-b border-slate-200 pb-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                    {COMPANY_PROFILE.name}
                  </h1>
                  {/* <p className="text-xs text-slate-600 mt-0.5">
                    TIN: {COMPANY_PROFILE.tin}
                  </p> */}
                  <p className="text-xs text-slate-600 mt-0.5">
                    {COMPANY_PROFILE.address}
                  </p>
                  {/* <p className="text-xs text-slate-600">
                    Contact: {COMPANY_PROFILE.phone}
                  </p> */}
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-sm tracking-wider uppercase rounded-md print:border print:border-black print:bg-white print:text-black">
                    {isQuotation
                      ? "PRICE QUOTATION"
                      : isDelivery
                        ? "DELIVERY RECEIPT"
                        : "SALES ORDER"}
                  </span>
                  <div className="mt-2 text-sm font-bold text-slate-900">
                    #{order.salesOrderNumber || (isQuotation ? "QUOTATION" : "—")}
                  </div>
                  <div className="text-xs text-slate-500">
                    Date:{" "}
                    {order.orderDate
                      ? formatDate(order.orderDate)
                      : "—"}
                  </div>
                </div>
              </div>
            </header>

            {/* Customer & Logistics Details */}
            <section className="grid grid-cols-2 gap-6 pb-6 mb-6 border-b border-slate-100 text-xs">
              <div>
                <h3 className="font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Customer Information
                </h3>
                <div className="font-semibold text-sm text-slate-900">
                  {customerName}
                </div>
                {customerPhone && (
                  <div className="text-slate-600 mt-0.5">
                    Tel / Mobile: {customerPhone}
                  </div>
                )}
                {customerAddress && (
                  <div className="text-slate-600 mt-0.5">
                    Address: {customerAddress}
                  </div>
                )}
                <div className="mt-2 text-slate-700">
                  <span className="font-medium text-slate-500">
                    Payment Method:
                  </span>{" "}
                  <span className="font-bold">{order.modeOfPayment || "CASH"}</span>
                  {order.checkNumber && (
                    <span className="ml-1 text-slate-500">
                      (Check #{order.checkNumber})
                    </span>
                  )}
                </div>
                {order.dueDate && (
                  <div className="text-slate-700 mt-0.5">
                    <span className="font-medium text-slate-500">Due Date:</span>{" "}
                    {formatDate(order.dueDate)}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Fulfillment & Delivery
                </h3>
                {isDelivery ? (
                  <div className="space-y-1">
                    <div className="font-medium text-slate-800">
                      Delivery Service:{" "}
                      <span className="font-bold text-indigo-700 print:text-black">
                        Standard Delivery
                      </span>
                    </div>
                    {order.deliveryDate && (
                      <div className="text-slate-600">
                        Scheduled Date: {formatDate(order.deliveryDate)}
                      </div>
                    )}
                    {order.deliveryAddress && (
                      <div className="text-slate-600">
                        Delivery Address: {order.deliveryAddress}
                      </div>
                    )}
                    {order.deliveryInstructions && (
                      <div className="text-slate-600 italic">
                        Instructions: {order.deliveryInstructions}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-600 italic">
                    Counter Pickup / Store Handover
                  </div>
                )}
              </div>
            </section>

            {/* Line Items Table */}
            <section className="mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 font-bold uppercase text-slate-800">
                    <th className="py-2 pr-2 w-8">#</th>
                    <th className="py-2 px-2 text-right w-16">Qty</th>
                    <th className="py-2 px-2 text-right w-16">Unit</th>
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2 text-right w-24">Price</th>
                    {hasDiscount && (
                      <th className="py-2 px-2 text-right w-20">Discount</th>
                    )}
                    <th className="py-2 pl-2 text-right w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(order.salesOrderItems || []).map((item: any, idx: number) => {
                    const price = Number(
                      item.purchasePrice ?? item.originalPrice ?? 0
                    );
                    const qty = Number(item.quantity || 0);
                    const discount = Number(item.discount || 0);
                    const lineTotal = Number(
                      item.totalAmount ?? qty * price - discount
                    );
                    const name =
                      item.nameSnapshot ||
                      item.combination?.name ||
                      "Item #" + (item.combinationId || idx + 1);
                    const sku =
                      item.skuSnapshot || item.combination?.sku || "";

                    return (
                      <tr key={item.id || idx} className="break-inside-avoid">
                        <td className="py-2.5 pr-2 text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-2 text-right font-medium text-slate-900">
                          {qty}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-600 uppercase">
                          {item.unit || "PCS"}
                        </td>

                        <td className="py-2.5 px-2">
                          <div className="font-semibold text-slate-900">
                            {name}
                          </div>
                          {item.discountNote && (
                            <div className="text-[10px] text-slate-500 italic">
                              Disc: {item.discountNote}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-700">
                          {formatCurrency(price)}
                        </td>
                        {hasDiscount && (
                          <td className="py-2.5 px-2 text-right text-slate-600">
                            {discount > 0 ? formatCurrency(discount) : "—"}
                          </td>
                        )}
                        <td className="py-2.5 pl-2 text-right font-bold text-slate-950">
                          {formatCurrency(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {/* Financial Ledger & Order Notes */}
            <section className="grid grid-cols-2 gap-8 mb-8 break-inside-avoid">
              <div className="text-xs">
                {order.notes && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 print:bg-white print:border-slate-300">
                    <span className="font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      {isQuotation ? "Quotation Notes / Terms:" : "Customer / Order Notes:"}
                    </span>
                    <p className="text-slate-600 whitespace-pre-wrap">
                      {order.notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-xs space-y-1.5">
                <div className="flex justify-between py-1 text-slate-600">
                  <span>Gross Subtotal:</span>
                  <span>{formatCurrency(summary.grossSubtotal)}</span>
                </div>
                {summary.totalDiscount > 0 && (
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Total Line Discounts:</span>
                    <span className="text-rose-600 print:text-black">
                      -{formatCurrency(summary.totalDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-semibold text-slate-800 border-t border-slate-200">
                  <span>Sale Amount:</span>
                  <span>{formatCurrency(summary.saleAmount)}</span>
                </div>
                {summary.totalReturnAmount > 0 && (
                  <div className="flex justify-between py-1 text-rose-600 print:text-black">
                    <span>Less: Returned Goods:</span>
                    <span>-{formatCurrency(summary.totalReturnAmount)}</span>
                  </div>
                )}
                {summary.totalExchangeAmount > 0 && (
                  <div className="flex justify-between py-1 text-slate-700">
                    <span>Plus: Exchanged Goods:</span>
                    <span>+{formatCurrency(summary.totalExchangeAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t-2 border-slate-900 font-black text-sm text-slate-950">
                  <span>Grand Total:</span>
                  <span className="text-base text-slate-950">
                    {formatCurrency(summary.grandTotal)}
                  </span>
                </div>
              </div>
            </section>

            {/* Acknowledgment & Signatures */}
            <footer className="pt-8 border-t border-slate-200 text-xs break-inside-avoid">
              <p className="text-center italic text-slate-600 mb-8">
                {isQuotation
                  ? "This quotation is valid for 30 days from date of issue and is subject to stock availability."
                  : "Received in good order and condition."}
              </p>
              <div className="grid grid-cols-2 gap-12 pt-4">
                <div className="text-center">
                  <div className="border-b border-slate-900 pb-1 mb-1" />
                  <div className="font-semibold text-slate-800">
                    Prepared By
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Authorized Store Representative
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-900 pb-1 mb-1" />
                  <div className="font-semibold text-slate-800">
                    {isQuotation ? "Accepted By" : "Received By"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isQuotation
                      ? "Customer Signature Over Printed Name"
                      : "Customer / Signature Over Printed Name"}
                  </div>
                </div>
              </div>
            </footer>
          </div>
        ) : (
          /* THERMAL POS (80MM) RECEIPT LAYOUT */
          <div
            data-format="pos"
            className="w-full max-w-[340px] mx-auto bg-white rounded-lg shadow-md border border-slate-200 p-4 text-[11px] font-mono leading-tight print:border-none print:shadow-none print:p-0"
          >
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-slate-400">
              <div className="font-bold text-xs uppercase">
                {COMPANY_PROFILE.name}
              </div>
              <div>TIN: {COMPANY_PROFILE.tin}</div>
              <div>{COMPANY_PROFILE.address}</div>
              <div>Tel: {COMPANY_PROFILE.phone}</div>
            </div>

            {/* Receipt Identification */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>{isQuotation ? "QUOTATION:" : "ORDER:"}</span>
                <span className="font-bold">
                  #{order.salesOrderNumber || (isQuotation ? "QUOTATION" : "—")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>
                  {order.orderDate ? formatDate(order.orderDate) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>CUSTOMER:</span>
                <span className="font-semibold truncate max-w-[180px]">
                  {customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>PAYMENT:</span>
                <span>{order.modeOfPayment || "CASH"}</span>
              </div>
              {isDelivery && (
                <div className="flex justify-between text-indigo-700 print:text-black font-semibold">
                  <span>DISPATCH:</span>
                  <span>DELIVERY</span>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-1.5">
              {(order.salesOrderItems || []).map((item: any, idx: number) => {
                const price = Number(
                  item.purchasePrice ?? item.originalPrice ?? 0
                );
                const qty = Number(item.quantity || 0);
                const discount = Number(item.discount || 0);
                const lineTotal = Number(
                  item.totalAmount ?? qty * price - discount
                );
                const name =
                  item.nameSnapshot ||
                  item.combination?.name ||
                  `Item #${idx + 1}`;

                return (
                  <div key={item.id || idx}>
                    <div className="font-semibold truncate">{name}</div>
                    <div className="flex justify-between text-slate-600">
                      <span>
                        {qty} {item.unit || "PCS"} × {formatCurrency(price)}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="text-[10px] text-rose-600 print:text-black text-right">
                        Less Disc: -{formatCurrency(discount)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Financial Ledger */}
            <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5">
              <div className="flex justify-between">
                <span>Gross Subtotal:</span>
                <span>{formatCurrency(summary.grossSubtotal)}</span>
              </div>
              {summary.totalDiscount > 0 && (
                <div className="flex justify-between">
                  <span>Discounts:</span>
                  <span>-{formatCurrency(summary.totalDiscount)}</span>
                </div>
              )}
              {summary.totalReturnAmount > 0 && (
                <div className="flex justify-between">
                  <span>Returns:</span>
                  <span>-{formatCurrency(summary.totalReturnAmount)}</span>
                </div>
              )}
              {summary.totalExchangeAmount > 0 && (
                <div className="flex justify-between">
                  <span>Exchanges:</span>
                  <span>+{formatCurrency(summary.totalExchangeAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-900">
                <span>TOTAL:</span>
                <span>{formatCurrency(summary.grandTotal)}</span>
              </div>
            </div>

            {/* Thermal Footer */}
            <div className="pt-3 text-center text-[10px] text-slate-500 space-y-1">
              <div>
                {isQuotation
                  ? "Quotation valid for 30 days."
                  : "Received above items in good order."}
              </div>
              <div className="pt-4 border-b border-slate-300 w-3/4 mx-auto" />
              <div>
                {isQuotation ? "Customer Acceptance" : "Customer Signature"}
              </div>
              <div className="pt-2 font-bold text-slate-700">
                {isQuotation ? "*** PRICE ESTIMATE ***" : "*** THANK YOU ***"}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
