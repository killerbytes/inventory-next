"use client";

import React, { useState, useTransition } from "react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import NumberInput from "@/components/common/NumberInput";
import { MODE_OF_PAYMENT, MODE_OF_PAYMENT_OPTIONS } from "@/constants";
import { formatCurrency } from "@/lib/utils";
import { createInvoicePaymentAction } from "@/server/actions/payment.actions";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/uiStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export interface AddInvoicePaymentModalProps {
  invoice: any;
  remainingBalance: number;
  onSuccess?: () => void;
}

function AddInvoicePaymentModalContent({
  invoice,
  remainingBalance,
  onSuccess,
}: AddInvoicePaymentModalProps) {
  const router = useRouter();
  const { setAddInvoicePaymentModalOpen } = useUIStore();
  const [paymentDate, setPaymentDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(MODE_OF_PAYMENT.BANK);
  const [amount, setAmount] = useState<number>(remainingBalance);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice?.id || !invoice?.supplierId) {
      toast.error("Invalid invoice or supplier information");
      return;
    }

    if (amount <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }

    if (amount > remainingBalance) {
      toast.error(
        `Payment amount (${formatCurrency(amount)}) exceeds remaining balance (${formatCurrency(remainingBalance)})`
      );
      return;
    }

    startTransition(async () => {
      try {
        await createInvoicePaymentAction({
          supplierId: Number(invoice.supplierId),
          amount: Number(amount),
          paymentDate,
          paymentMethod,
          referenceNo: referenceNo.trim() || undefined,
          notes: notes.trim() || undefined,
          applications: [
            {
              invoiceId: Number(invoice.id),
              amountApplied: Number(amount),
            },
          ],
        });

        toast.success(`Payment of ${formatCurrency(amount)} recorded successfully`);
        setAddInvoicePaymentModalOpen(false);
        router.refresh();
      } catch (err: any) {
        console.error("Error recording invoice payment:", err);
        toast.error(err.message || "Failed to record payment");
      }
    });
  };

  return (
    <Modal
      isOpen
      onClose={() => setAddInvoicePaymentModalOpen(false)}
      title={`Add Payment: #${invoice?.invoiceNumber || invoice?.id}`}
      description={`Record a supplier payment against this invoice. Outstanding balance: ${formatCurrency(
        remainingBalance
      )}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(e) => setPaymentMethod(e)}
              items={MODE_OF_PAYMENT_OPTIONS}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {MODE_OF_PAYMENT_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Number */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="referenceNo">Reference No. (Check # / Wire Ref)</Label>
            <Input
              id="referenceNo"
              placeholder="e.g. CHK-98721, WT-2026-090"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount">Amount to Apply *</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setAmount(remainingBalance)}
              >
                Pay Full Balance ({formatCurrency(remainingBalance)})
              </button>
            </div>
            <NumberInput
              value={amount}
              onChange={(val) => setAmount(Number(val) || 0)}
              type="currency"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Check bank details, memo, or payment notes..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="outline" type="button" onClick={() => setAddInvoicePaymentModalOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || amount <= 0}>
            {isPending ? "Recording..." : `Apply ${formatCurrency(amount)}`}
          </Button>
        </DialogFooter>
      </form>
    </Modal>
  );
}


export default function AddInvoicePaymentModal({
  remainingBalance,
  invoice
}: {
  remainingBalance: number;
  invoice: any;
}) {
  const { isAddInvoicePaymentModalOpen, setAddInvoicePaymentModalOpen } = useUIStore();

  if (!isAddInvoicePaymentModalOpen) return null;

  return (
    <Modal
      title="Add Payment"
      description={`Record a supplier payment against this invoice. Outstanding balance: ${formatCurrency(
        remainingBalance
      )}.`}
      isOpen={isAddInvoicePaymentModalOpen}
      onClose={() => setAddInvoicePaymentModalOpen(false)}
    >
      <AddInvoicePaymentModalContent
        remainingBalance={remainingBalance}
        invoice={invoice}
      />
    </Modal>
  );
}
