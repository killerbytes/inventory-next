"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import Loader from "@/components/common/Loader";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoiceGoodReceipt } from "@/schemas/goodReceipt.schema";
import { getGoodReceiptsBySupplierAction } from "@/server/actions/invoice.actions";
import { useUIStore } from "@/stores/uiStore";
import { ORDER_STATUS, STATUS_COLOR } from "@/types/definitions";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

export interface GoodReceiptPickerModalProps {
  supplierId: number;
  onSubmit: (selected: InvoiceGoodReceipt[]) => void;
  defaultSelected?: any[];
}

function GoodReceiptPickerModalContent({
  supplierId,
  onSubmit,
  defaultSelected = [],
}: GoodReceiptPickerModalProps) {
  const [data, setData] = useState<InvoiceGoodReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const { setGoodReceiptPickerModalOpen } = useUIStore();

  useEffect(() => {
    if (!supplierId) return;

    let mounted = true;
    setIsLoading(true);

    getGoodReceiptsBySupplierAction(supplierId, {
      status: ORDER_STATUS.RECEIVED,
      limit: 100,
    })
      .then((res) => {
        if (!mounted) return;

        const items = res?.data || [];
        setData(items);

        // Pre-select items that match defaultSelected
        const initialSelection: Record<string, boolean> = {};
        const defaultIds = new Set(
          defaultSelected.map((d: any) => Number(d.id || d.goodReceiptId)),
        );
        items.forEach((item: any, idx: number) => {
          if (defaultIds.has(item.id)) {
            initialSelection[String(idx)] = true;
          }
        });
        setRowSelection(initialSelection);
      })
      .catch((err) => {
        console.error("Error loading good receipts for supplier:", err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [supplierId]);

  const columns: ColumnDef<InvoiceGoodReceipt>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        meta: {
          className: "w-10",
        },
      },
      {
        accessorKey: "referenceNo",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.referenceNo}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <ColorBadge colorMap={STATUS_COLOR}>
            {String(row.original.status)}
          </ColorBadge>
        ),
      },
      {
        accessorKey: "receiptDate",
        header: "Receipt Date",
        meta: {
          className: "text-xs text-muted-foreground",
        },
        cell: ({ row }) => formatDate(row.original.receiptDate),
      },
      {
        accessorKey: "totalAmount",
        header: "Payable Amount",
        meta: {
          align: "right",
        },
        cell: ({ row }) => {
          const total = Number(row.original.totalAmount || 0);
          const returns = Number(row.original.totalReturnAmount || 0);
          const net = total - returns;
          return (
            <div
              className={
                returns > 0 ? "text-rose-600 font-medium" : "font-medium"
              }
            >
              {formatCurrency(net)}
              {returns > 0 && (
                <span className="text-xs text-muted-foreground block">
                  (Orig: {formatCurrency(total)}, Ret: -
                  {formatCurrency(returns)})
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  const selectedItems = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((k) => data[Number(k)])
      .filter(Boolean);
  }, [rowSelection, data]);

  const handleConfirm = () => {
    onSubmit(selectedItems);
    setGoodReceiptPickerModalOpen(false);
  };

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No received good receipts found for this supplier.
        </div>
      ) : (
        <div className="max-h-[50vh] overflow-y-auto border rounded-md">
          <DataTable
            data={data}
            columns={columns}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
          />
        </div>
      )}

      <DialogFooter className="items-center justify-between!">
        <div className="text-sm text-muted-foreground font-medium">
          {selectedItems.length} receipt
          {selectedItems.length === 1 ? "" : "s"} selected
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => setGoodReceiptPickerModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selectedItems.length === 0}
            onClick={handleConfirm}
          >
            Add Selected ({selectedItems.length})
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

export default function GoodReceiptPickerModal(
  props: GoodReceiptPickerModalProps,
) {
  const { isGoodReceiptPickerModalOpen, setGoodReceiptPickerModalOpen } =
    useUIStore();

  if (!isGoodReceiptPickerModalOpen) return null;

  return (
    <Modal
      title="Select Good Receipts"
      description="Choose received shipments to include in this invoice."
      isOpen={isGoodReceiptPickerModalOpen}
      onClose={() => setGoodReceiptPickerModalOpen(false)}
      size="md"
    >
      <GoodReceiptPickerModalContent {...props} />
    </Modal>
  );
}
