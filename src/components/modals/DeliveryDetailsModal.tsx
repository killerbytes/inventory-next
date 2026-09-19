"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface DeliveryDetailsModalProps {
  data?: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function DeliveryDetailsModal({
  data,
  isOpen,
  onClose,
}: DeliveryDetailsModalProps) {
  const deliveryDateFormatted = data?.deliveryDate
    ? new Date(data.deliveryDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delivery Details</DialogTitle>
          <DialogDescription>
            Fulfillment and shipment delivery schedule information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div>
            <Label className="text-muted-foreground text-xs uppercase font-semibold">
              Delivery Date
            </Label>
            <div className="font-semibold text-sm mt-0.5">
              {deliveryDateFormatted}
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground text-xs uppercase font-semibold">
              Delivery Address
            </Label>
            <div className="font-semibold text-sm mt-0.5">
              {data?.deliveryAddress || "No delivery address specified"}
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground text-xs uppercase font-semibold">
              Delivery Notes / Instructions
            </Label>
            <div className="font-semibold text-sm mt-0.5">
              {data?.deliveryInstructions || "No delivery instructions provided"}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
