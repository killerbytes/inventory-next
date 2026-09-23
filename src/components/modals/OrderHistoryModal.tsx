"use client";

import ColorBadge from "@/components/common/ColorBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { OrderStatusHistoryData } from "@/schemas/orderStatusHistory.schema";
import { useUIStore } from "@/stores/uiStore";
import { ORDER_STATUS } from "@/types/definitions";
import Modal from "../common/Modal";

export interface StatusHistoryItem {
  id: number;
  status: string;
  changedAt: string;
  user?: {
    username: string;
  };
}

function OrderHistoryModalContent({
  data = [],
}: {
  data: OrderStatusHistoryData[];
}) {
  return (
    <>
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
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground py-4"
                >
                  No status audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((history) => (
                <TableRow key={history.id}>
                  <TableCell>
                    <ColorBadge colorMap={ORDER_STATUS}>
                      {history.status}
                    </ColorBadge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {history.user?.username}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(history.changedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export default function OrderHistoryModal({
  data,
}: {
  data: OrderStatusHistoryData[];
}) {
  const { isOrderHistoryModalOpen, setOrderHistoryModalOpen } = useUIStore();

  if (!isOrderHistoryModalOpen) return null;

  return (
    <Modal
      title="Order Status History"
      description="Order status changes and transaction histories."
      isOpen={isOrderHistoryModalOpen}
      onClose={() => setOrderHistoryModalOpen(false)}
    >
      <OrderHistoryModalContent data={data} />
    </Modal>
  );
}
