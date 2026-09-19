"use client";

import React, { useState, useTransition } from "react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import NumberInput from "@/components/common/NumberInput";
import { MODE_OF_PAYMENT } from "@/types/definitions";
import { formatCurrency } from "@/lib/utils";
import { createInvoicePaymentAction } from "@/server/actions/payment.actions";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface AddInvoicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  remainingBalance: number;
  onSuccess?: () => void;
}

export default function AddInvoicePaymentModal({
  isOpen,
  onClose,
  invoice,
  remainingBalance,
  onSuccess,
}: AddInvoicePaymentModalProps) {
  const router = useRouter();
  const [paymentDate, setPaymentDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [referenceNo, setReferenceNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(MODE_OF_PAYMENT.BANK);
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
        onClose();
        if (onSuccess) onSuccess();
        router.refresh();
      } catch (err: any) {
        console.error("Error recording invoice payment:", err);
        toast.error(err.message || "Failed to record payment");
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
            <select
              id="paymentMethod"
              className="w-full h-10 px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value={MODE_OF_PAYMENT.BANK}>Bank Transfer</option>
              <option value={MODE_OF_PAYMENT.CHECK}>Check</option>
              <option value={MODE_OF_PAYMENT.CASH}>Cash</option>
              <option value={MODE_OF_PAYMENT.EWALLET}>E-Wallet</option>
            </select>
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

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
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
