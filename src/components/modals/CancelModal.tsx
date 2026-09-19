"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { cancelSalesOrderAction } from "@/server/actions/salesOrder.actions";
import { toast } from "sonner";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (reason: string) => Promise<void> | void;
  orderId?: number;
  title?: string;
  description?: string;
}

export default function CancelModal({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  title = "Cancel Order",
  description = "Are you sure you want to cancel this order? This action cannot be undone.",
}: CancelModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (onConfirm) {
        await onConfirm(reason);
      } else if (orderId) {
        await cancelSalesOrderAction(orderId, reason);
        toast.success("Order cancelled successfully");
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to cancel order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Notes / Reason</Label>
            <Textarea
              id="reason"
              placeholder="Provide context for this cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Keep Active
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
