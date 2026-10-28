"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import Loader from "@/components/common/Loader";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getUninvoicedSalesOrdersAction } from "@/server/actions/salesInvoice.actions";
import { useUIStore } from "@/stores/uiStore";
import { STATUS_COLOR } from "@/constants";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

export interface SalesOrderPickerModalProps {
  customerId: number;
  onSubmit: (selected: any[]) => void;
  defaultSelected?: any[];
}

function SalesOrderPickerModalContent({
  customerId,
  onSubmit,
  defaultSelected = [],
}: SalesOrderPickerModalProps) {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const { setSalesOrderPickerModalOpen } = useUIStore();

  useEffect(() => {
    if (!customerId) return;

    let mounted = true;
    setIsLoading(true);

    getUninvoicedSalesOrdersAction(customerId)
      .then((res) => {
        if (!mounted) return;
        const items = res || [];
        setData(items);

        // Pre-select items matching defaultSelected
        const initialSelection: Record<string, boolean> = {};
        const defaultIds = new Set(
          defaultSelected.map((d: any) => Number(d.id || d.salesOrderId)),
        );
        items.forEach((item: any, idx: number) => {
          if (defaultIds.has(item.id)) {
            initialSelection[String(idx)] = true;
          }
        });
        setRowSelection(initialSelection);
      })
      .catch((err) => {
        console.error("Error loading sales orders for customer:", err);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [customerId]);

  const columns: ColumnDef<any>[] = useMemo(
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
        accessorKey: "salesOrderNumber",
        header: "Order Ref #",
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.salesOrderNumber}</span>
        ),
      },
      {
        accessorKey: "orderDate",
        header: "Order Date",
        meta: {
          className: "text-xs text-muted-foreground",
        },
        cell: ({ row }) => formatDate(row.original.orderDate),
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
        accessorKey: "modeOfPayment",
        header: "Payment Mode",
        cell: ({ row }) => (
          <span className="text-xs uppercase">{row.original.modeOfPayment || "CASH"}</span>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Order Amount",
        meta: {
          align: "right",
        },
        cell: ({ row }) => (
          <span className="font-semibold text-emerald-600">
            {formatCurrency(row.original.totalAmount)}
          </span>
        ),
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

  const totalSelectedAmount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  }, [selectedItems]);

  const handleConfirm = () => {
    onSubmit(selectedItems);
    setSalesOrderPickerModalOpen(false);
  };

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No un-invoiced orders found for this customer.
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
        <div className="text-sm font-medium">
          <span className="text-muted-foreground">
            {selectedItems.length} order{selectedItems.length === 1 ? "" : "s"} selected
          </span>
          {selectedItems.length > 0 && (
            <span className="ml-2 font-semibold text-emerald-600">
              ({formatCurrency(totalSelectedAmount)})
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => setSalesOrderPickerModalOpen(false)}
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

export default function SalesOrderPickerModal(props: SalesOrderPickerModalProps) {
  const { isSalesOrderPickerModalOpen, setSalesOrderPickerModalOpen } = useUIStore();

  if (!isSalesOrderPickerModalOpen) return null;

  return (
    <Modal
      title="Select Sales Orders"
      description="Choose completed or fulfilled sales orders to bundle into this Statement of Account."
      isOpen={isSalesOrderPickerModalOpen}
      onClose={() => setSalesOrderPickerModalOpen(false)}
      size="lg"
    >
      <SalesOrderPickerModalContent {...props} />
    </Modal>
  );
}
