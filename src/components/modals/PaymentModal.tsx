"use client";

import React, { useState, useEffect } from "react";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { MODE_OF_PAYMENT } from "@/types/definitions";
import { createPaymentAction } from "@/server/actions/payment.actions";
import { toast } from "sonner";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId?: number;
  balance?: number;
  onSuccess?: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  invoiceId,
  balance = 0,
  onSuccess,
}: PaymentModalProps) {
  const [amount, setAmount] = useState(balance);
  const [mode, setMode] = useState<string>(MODE_OF_PAYMENT.CASH);
  const [referenceNo, setReferenceNo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAmount(balance);
  }, [balance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) {
      toast.error("Invalid invoice reference.");
      return;
    }
    if (amount <= 0) {
      toast.error("Payment amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createPaymentAction({
        salesOrderId: invoiceId,
        amountPaid: amount,
        paymentMethod: mode,
        notes: referenceNo.trim() || undefined,
      });
      toast.success(
        `Payment of ₱${amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })} recorded for Invoice #${invoiceId}!`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Apply Payment {invoiceId ? `to Invoice #${invoiceId}` : ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted/40 rounded-lg text-sm flex justify-between">
            <span className="text-muted-foreground">Outstanding Balance:</span>
            <span className="font-mono font-bold text-rose-600">
              ₱{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <label className="text-sm font-medium">Payment Amount</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={balance > 0 ? balance : undefined}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1.5 font-mono text-lg font-bold"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Payment Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full mt-1.5 h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value={MODE_OF_PAYMENT.CASH}>CASH</option>
              <option value={MODE_OF_PAYMENT.CHECK}>CHECK</option>
              <option value={MODE_OF_PAYMENT.EWALLET}>EWALLET</option>
              <option value={MODE_OF_PAYMENT.BANK}>BANK</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Official Receipt / Reference No.</label>
            <Input
              placeholder="e.g. OR-99881"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className="mt-1.5"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? "Recording..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
