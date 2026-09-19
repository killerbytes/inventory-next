"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ColorBadge from "@/components/common/ColorBadge";

export interface StatusHistoryItem {
  id: number;
  status: string;
  changedAt: string;
  user?: {
    username: string;
  };
}

export default function OrderHistoryModal({
  data = [],
  isOpen,
  onClose,
}: {
  data: StatusHistoryItem[];
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Order Status History</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border overflow-hidden mt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Changed By</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                    No status audit logs found.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((history) => (
                  <TableRow key={history.id}>
                    <TableCell>
                      <ColorBadge colorMap={{ DEFAULT: "bg-purple-100 text-purple-800" }}>
                        {history.status}
                      </ColorBadge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {history.user?.username || "System"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(history.changedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
