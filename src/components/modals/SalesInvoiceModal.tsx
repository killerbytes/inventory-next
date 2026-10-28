"use client";

import ConfirmDialog from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CustomerData } from "@/schemas/customer.schema";
import {
  calculateStatementBalances,
  DEFAULT_STATEMENT_NOTES,
  RawStatementLine,
} from "@/schemas/salesInvoice.schema";
import {
  createSalesInvoiceAction,
  updateSalesInvoiceAction,
} from "@/server/actions/salesInvoice.actions";
import { useUIStore } from "@/stores/uiStore";
import { INVOICE_STATUS } from "@/constants";
import { ColumnDef } from "@tanstack/react-table";
import { addDays, format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import DatePicker from "../common/DatePicker";
import { Autocomplete, AutocompleteOption } from "../common/Autocomplete";
import SalesOrderPickerModal from "./SalesOrderPickerModal";

export interface SalesInvoiceModalProps {
  customers: CustomerData[];
}

function SalesInvoiceModalContent({ customers }: SalesInvoiceModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    setSalesOrderPickerModalOpen,
    setSalesInvoiceModalOpen,
    editingSalesInvoice,
  } = useUIStore();

  const isEditing = Boolean(editingSalesInvoice?.id);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    editingSalesInvoice?.customerId || null
  );
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    editingSalesInvoice?.invoiceNumber || ""
  );
  const [invoiceDate, setInvoiceDate] = useState<string>(
    editingSalesInvoice?.invoiceDate
      ? format(new Date(editingSalesInvoice.invoiceDate), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );
  const [dueDate, setDueDate] = useState<string>(
    editingSalesInvoice?.dueDate
      ? format(new Date(editingSalesInvoice.dueDate), "yyyy-MM-dd")
      : format(addDays(new Date(), 15), "yyyy-MM-dd")
  );
  const [previousBalance, setPreviousBalance] = useState<number>(
    Number(editingSalesInvoice?.previousBalance || 0)
  );
  const [notes, setNotes] = useState<string>(
    editingSalesInvoice?.notes || DEFAULT_STATEMENT_NOTES
  );
  const [lines, setLines] = useState<RawStatementLine[]>(() => {
    if (editingSalesInvoice?.salesInvoiceLines) {
      return editingSalesInvoice.salesInvoiceLines.map((l: any) => ({
        salesOrderId: l.salesOrderId,
        orderDate: l.orderDate,
        refNo: l.refNo,
        description: l.description,
        charges: Number(l.charges || 0),
        payments: Number(l.payments || 0),
        balance: Number(l.balance || 0),
      }));
    }
    return [];
  });

  const customerOptions: AutocompleteOption[] = useMemo(() => {
    return customers.map((c) => ({
      id: c.id,
      name: c.name,
    }));
  }, [customers]);

  const selectedCustomerName = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId)?.name || "";
  }, [customers, selectedCustomerId]);

  const handleOrdersSelected = (selectedOrders: any[]) => {
    const existingOrderIds = new Set(lines.map((l) => l.salesOrderId));
    const newLines = [...lines];

    for (const order of selectedOrders) {
      if (!existingOrderIds.has(order.id)) {
        newLines.push({
          salesOrderId: order.id,
          orderDate: order.orderDate,
          refNo: order.salesOrderNumber,
          description: order.notes || `Sales Order #${order.salesOrderNumber}`,
          charges: Number(order.totalAmount || 0),
          payments: 0,
        });
      }
    }

    setLines(newLines);
  };

  const handleRemoveLine = (salesOrderId: number) => {
    setLines((prev) => prev.filter((l) => l.salesOrderId !== salesOrderId));
  };

  const handleLineChange = (index: number, field: keyof RawStatementLine, value: any) => {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  // Recompute progressive running balances
  const statementCalculation = useMemo(() => {
    return calculateStatementBalances(lines, previousBalance);
  }, [lines, previousBalance]);

  const handleSubmit = (targetStatus: string = INVOICE_STATUS.DRAFT) => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer for this Statement of Account.");
      return;
    }

    if (lines.length === 0) {
      toast.error("Please add at least one sales order line.");
      return;
    }

    startTransition(async () => {
      try {
        const payload: any = {
          customerId: selectedCustomerId,
          invoiceNumber: invoiceNumber.trim() || undefined,
          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          status: targetStatus,
          previousBalance: statementCalculation.previousBalance,
          totalCharges: statementCalculation.totalCharges,
          totalPayments: statementCalculation.totalPayments,
          amountDue: statementCalculation.amountDue,
          notes: notes.trim(),
          salesInvoiceLines: statementCalculation.lines,
        };

        if (isEditing && editingSalesInvoice?.id) {
          await updateSalesInvoiceAction(editingSalesInvoice.id, payload);
          toast.success(`Sales invoice #${editingSalesInvoice.invoiceNumber} updated successfully`);
        } else {
          const res = await createSalesInvoiceAction(payload);
          toast.success(
            targetStatus === INVOICE_STATUS.POSTED
              ? `Statement #${res?.invoiceNumber || ""} created and posted`
              : `Statement #${res?.invoiceNumber || ""} saved as draft`
          );
        }

        setSalesInvoiceModalOpen(false);
        router.refresh();
      } catch (err: any) {
        console.error("Error saving sales invoice:", err);
        toast.error(err.message || "Failed to save statement of account");
      }
    });
  };

  const lineColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-rose-500 hover:text-rose-700 h-8 w-8"
            onClick={() => handleRemoveLine(row.original.salesOrderId)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
        meta: {
          className: "w-10",
        },
      },
      {
        accessorKey: "orderDate",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.orderDate),
      },
      {
        accessorKey: "refNo",
        header: "Ref No",
        cell: ({ row }) => (
          <span className="font-semibold">{row.original.refNo || "-"}</span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <Input
            value={row.original.description || ""}
            onChange={(e) => handleLineChange(row.index, "description", e.target.value)}
            className="h-8 text-xs min-w-[150px]"
            placeholder="Item / Order description"
          />
        ),
      },
      {
        accessorKey: "charges",
        header: () => <div className="text-right">Charges</div>,
        meta: {
          align: "right",
        },
        cell: ({ row }) => (
          <span className="font-medium">{formatCurrency(row.original.charges)}</span>
        ),
      },
      {
        accessorKey: "payments",
        header: () => <div className="text-right">Payments</div>,
        meta: {
          align: "right",
        },
        cell: ({ row }) => (
          <Input
            type="number"
            step="any"
            value={row.original.payments || 0}
            onChange={(e) => handleLineChange(row.index, "payments", Number(e.target.value) || 0)}
            className="h-8 text-xs w-24 text-right ml-auto"
          />
        ),
      },
      {
        accessorKey: "balance",
        header: () => <div className="text-right">Balance</div>,
        meta: {
          align: "right",
          className: "font-semibold text-emerald-600",
        },
        cell: ({ row }) => formatCurrency(row.original.balance),
      },
    ],
    [lines]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs uppercase font-bold text-muted-foreground">
            Customer *
          </Label>
          <Autocomplete
            options={customerOptions}
            value={selectedCustomerName}
            onChange={(item: AutocompleteOption) => setSelectedCustomerId(item ? Number(item.id) : null)}
            placeholder="Select a customer..."
            disabled={isEditing}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs uppercase font-bold text-muted-foreground">
            Statement Date *
          </Label>
          <div className="mt-1">
            <DatePicker
              value={invoiceDate}
              onChange={(d) => setInvoiceDate(d)}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs uppercase font-bold text-muted-foreground">
            Due Date
          </Label>
          <div className="mt-1">
            <DatePicker
              value={dueDate}
              onChange={(d) => setDueDate(d)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs uppercase font-bold text-muted-foreground">
            Statement / Invoice No (Auto-generated if empty)
          </Label>
          <Input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="e.g. SI-2026-10-0001"
            className="mt-1 h-9"
          />
        </div>

        <div>
          <Label className="text-xs uppercase font-bold text-muted-foreground">
            Previous Balance
          </Label>
          <Input
            type="number"
            step="any"
            value={previousBalance}
            onChange={(e) => setPreviousBalance(Number(e.target.value) || 0)}
            placeholder="0.00"
            className="mt-1 h-9"
          />
        </div>
      </div>

      {/* Sales Orders Section */}
      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Included Sales Orders</h3>
            <p className="text-xs text-muted-foreground">
              Select completed customer orders to aggregate into this statement.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedCustomerId}
            onClick={() => setSalesOrderPickerModalOpen(true)}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Sales Orders
          </Button>
        </div>

        {statementCalculation.lines.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-md text-sm text-muted-foreground">
            No sales orders selected. Click &quot;Add Sales Orders&quot; to populate.
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <DataTable
              data={statementCalculation.lines}
              columns={lineColumns}
            />
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="flex justify-end border-t pt-3">
        <div className="w-full md:w-72 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Previous Balance:</span>
            <span>{formatCurrency(statementCalculation.previousBalance)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Total Charges:</span>
            <span>{formatCurrency(statementCalculation.totalCharges)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Total Payments:</span>
            <span>{formatCurrency(statementCalculation.totalPayments)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t pt-2 text-emerald-600">
            <span>Amount Due:</span>
            <span>{formatCurrency(statementCalculation.amountDue)}</span>
          </div>
        </div>
      </div>

      {/* Bank Deposit Notes */}
      <div className="border-t pt-3">
        <Label className="text-xs uppercase font-bold text-muted-foreground">
          Payment Instructions & Bank Account Notes
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 font-mono text-xs"
          placeholder="Bank details to show on the printed customer statement..."
        />
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          variant="outline"
          type="button"
          onClick={() => setSalesInvoiceModalOpen(false)}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={isPending || statementCalculation.lines.length === 0}
            onClick={() => handleSubmit(INVOICE_STATUS.DRAFT)}
          >
            Save as Draft
          </Button>
          <ConfirmDialog
            title="Post Statement of Account"
            description="Posting this statement of account will finalize charges and set its status to POSTED. Do you wish to continue?"
            confirmText="Confirm & Post"
            onConfirm={() => handleSubmit(INVOICE_STATUS.POSTED)}
          >
            <Button
              type="button"
              disabled={isPending || statementCalculation.lines.length === 0}
            >
              Create & Post
            </Button>
          </ConfirmDialog>
        </div>
      </DialogFooter>

      {/* Picker Modal */}
      {selectedCustomerId && (
        <SalesOrderPickerModal
          customerId={selectedCustomerId}
          defaultSelected={lines}
          onSubmit={handleOrdersSelected}
        />
      )}
    </div>
  );
}

export default function SalesInvoiceModal(props: SalesInvoiceModalProps) {
  const { isSalesInvoiceModalOpen, setSalesInvoiceModalOpen, editingSalesInvoice } =
    useUIStore();

  if (!isSalesInvoiceModalOpen) return null;

  return (
    <Modal
      title={
        editingSalesInvoice?.id
          ? `Edit Statement #${editingSalesInvoice.invoiceNumber}`
          : "New Statement of Account / Sales Invoice"
      }
      description="Bundle customer sales orders into an official statement with cumulative running balances."
      isOpen={isSalesInvoiceModalOpen}
      onClose={() => setSalesInvoiceModalOpen(false)}
      size="xl"
    >
      <SalesInvoiceModalContent {...props} />
    </Modal>
  );
}
