"use client";

import ColorBadge from "@/components/common/ColorBadge";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { InvoiceLineData } from "@/schemas";
import {
  InvoiceGoodReceipt,
  InvoiceGoodReceiptSchema,
} from "@/schemas/goodReceipt.schema";
import { SupplierData } from "@/schemas/supplier.schema";
import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/server/actions/invoice.actions";
import { getSuppliersAction } from "@/server/actions/supplier.actions";
import { useUIStore } from "@/stores/uiStore";
import { INVOICE_STATUS, STATUS_COLOR } from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { addWeeks, format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import DatePicker from "../common/DatePicker";
import FormField from "../forms/FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import GoodReceiptPickerModal from "./GoodReceiptPickerModal";

export interface InvoiceModalProps {
  suppliers: SupplierData[];
}

const InvoiceFormSchema = z.object({
  gr: z.array(InvoiceGoodReceiptSchema),
  notes: z.string().nullish(),
  status: z.string(),
  invoiceNumber: z.string(),
  dueDate: z.string(),
  invoiceDate: z.string(),
  supplierId: z.number(),
});

type InvoiceForm = z.infer<typeof InvoiceFormSchema>;

function InvoiceModalContent({ suppliers: propSuppliers }: InvoiceModalProps) {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierData[]>(
    propSuppliers || [],
  );
  const [confirmPostOpen, setConfirmPostOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { setGoodReceiptPickerModalOpen, setInvoiceModalOpen, editingInvoice } =
    useUIStore();

  const isEditing = !!editingInvoice?.id;

  const defaultValues = useMemo(() => {
    if (editingInvoice) {
      const existingGr: InvoiceGoodReceipt[] = (
        editingInvoice.invoiceLines || []
      ).map((line: InvoiceLineData) => ({
        id: line.goodReceiptId,
        referenceNo: line.goodReceipt.referenceNo,
        status: line.goodReceipt.status,
        receiptDate: line.goodReceipt.receiptDate,
        totalAmount: Number(line.amount || 0),
        totalReturnAmount: 0,
      }));

      return {
        supplierId: Number(editingInvoice.supplierId || 0),
        invoiceNumber: editingInvoice.invoiceNumber || "",
        invoiceDate: editingInvoice.invoiceDate
          ? format(new Date(editingInvoice.invoiceDate), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        dueDate: editingInvoice.dueDate
          ? format(new Date(editingInvoice.dueDate), "yyyy-MM-dd")
          : format(addWeeks(new Date(), 2), "yyyy-MM-dd"),
        status: editingInvoice.status || INVOICE_STATUS.DRAFT,
        notes: editingInvoice.notes || "",
        gr: existingGr,
      };
    }

    return {
      supplierId: 1,
      invoiceNumber: "x",
      invoiceDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: format(addWeeks(new Date(), 2), "yyyy-MM-dd"),
      status: INVOICE_STATUS.DRAFT,
      notes: "",
      gr: [],
    };
  }, [editingInvoice]);

  const form = useForm<InvoiceForm>({
    resolver: zodResolver(InvoiceFormSchema),
    defaultValues,
  });
  const { watch, reset } = form;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (!propSuppliers || propSuppliers.length === 0) {
      getSuppliersAction()
        .then((data) => setSuppliers(data || []))
        .catch((err) => console.error("Error loading suppliers:", err));
    }
  }, [propSuppliers]);

  const selectedSupplierId = watch("supplierId");
  const selectedGr = watch("gr") || [];

  const handlePickerSubmit = (selected: InvoiceGoodReceipt[]) => {
    console.log(selected);

    form.setValue("gr", selected, { shouldValidate: true });
  };

  const handleRemoveGr = (id: number) => {
    form.setValue(
      "gr",
      selectedGr.filter((g: InvoiceGoodReceipt) => g.id !== id),
      { shouldValidate: true },
    );
  };

  const submitWithStatus = async (
    values: InvoiceForm,
    targetStatus: string,
  ) => {
    console.log(values);

    startTransition(async () => {
      try {
        const invoiceLines = values.gr.map((item: InvoiceGoodReceipt) => ({
          goodReceiptId: Number(item.id),
          amount: Math.max(
            0,
            Number(item.totalAmount) - Number(item.totalReturnAmount || 0),
          ),
        }));

        const payload = {
          supplierId: Number(values.supplierId),
          invoiceNumber: values.invoiceNumber.trim(),
          invoiceDate: values.invoiceDate,
          dueDate: values.dueDate,
          status: targetStatus,
          notes: values.notes?.trim() || null,
          invoiceLines,
        };

        if (isEditing) {
          await updateInvoiceAction(editingInvoice.id, payload);
          toast.success(
            `Invoice #${values.invoiceNumber} updated successfully`,
          );
        } else {
          await createInvoiceAction(payload);
          toast.success(
            targetStatus === INVOICE_STATUS.POSTED
              ? `Invoice #${values.invoiceNumber} created and posted`
              : `Invoice #${values.invoiceNumber} saved as draft`,
          );
        }

        setInvoiceModalOpen(false);
        router.refresh();
      } catch (err: any) {
        console.error("Error submitting invoice:", err);
        toast.error(err.message || "Failed to save invoice");
      }
    });
  };

  const totalInvoiceAmount = useMemo(() => {
    console.log(selectedGr);
    return selectedGr.reduce(
      (sum: number, item: InvoiceGoodReceipt) =>
        sum +
        Math.max(
          0,
          Number(item.totalAmount) - Number(item.totalReturnAmount || 0),
        ),
      0,
    );
  }, [selectedGr]);

  const columns: ColumnDef<InvoiceGoodReceipt>[] = useMemo(
    () => [
      {
        id: "actions",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-rose-500 hover:text-rose-700"
            onClick={() => handleRemoveGr(row.original.id)}
          >
            <Trash2 />
          </Button>
        ),
      },
      {
        accessorKey: "referenceNo",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.referenceNo}</span>
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
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <ColorBadge colorMap={STATUS_COLOR}>
            {String(row.original.status)}
          </ColorBadge>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: () => <div className="text-right">Net Payable</div>,
        meta: {
          align: "right",
          className: "font-medium",
        },
        cell: ({ row }) => {
          const net = Math.max(
            0,
            Number(row.original.totalAmount || 0) -
              Number(row.original.totalReturnAmount || 0),
          );
          return formatCurrency(net);
        },
      },
    ],
    [selectedGr],
  );
  console.log(form.getValues());

  return (
    <>
      <form className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <FormField
            form={form}
            name="supplierId"
            label="Supplier *"
            render={({ field }) => (
              <Select
                {...field}
                onValueChange={(value) => {
                  const val = Number(value);
                  field.onChange(val);
                  if (val !== selectedSupplierId) {
                    form.setValue("gr", []);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Supplier">
                    {field.value
                      ? suppliers.find((s) => s.id === field.value)?.name
                      : "Select Supplier"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Select Supplier</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />

          <FormField
            form={form}
            name="invoiceNumber"
            label="Invoice Number *"
            placeholder="Supplier Invoice #"
          />

          <FormField
            form={form}
            name="invoiceDate"
            label="Invoice Date"
            render={({ field }) => <DatePicker {...field} />}
          />

          <FormField
            form={form}
            name="dueDate"
            label="Due Date"
            render={({ field }) => <DatePicker {...field} />}
          />
        </div>

        <FormField
          form={form}
          name="notes"
          label="Notes"
          render={({ field }) => (
            <Textarea
              id="notes"
              placeholder="Terms, payment instructions, or internal remarks..."
              rows={2}
              {...field}
            />
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">
              Billed Good Receipts ({selectedGr.length})
            </Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!selectedSupplierId}
              onClick={() => setGoodReceiptPickerModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Good Receipts
            </Button>
          </div>

          <div className="border rounded-md max-h-[35vh] overflow-y-auto">
            <DataTable
              data={selectedGr}
              columns={columns}
              renderFooter={() => (
                <tr className="border-t font-semibold bg-muted/50">
                  <td colSpan={4} className="p-3 text-right">
                    Total Invoice Amount:
                  </td>
                  <td className="p-3 text-right  font-bold text-base text-primary">
                    {formatCurrency(totalInvoiceAmount)}
                  </td>
                  <td></td>
                </tr>
              )}
            />
          </div>
        </div>

        <DialogFooter className="items-center justify-between!">
          <Button
            variant="outline"
            type="button"
            onClick={() => setInvoiceModalOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={form.handleSubmit((vals) =>
                submitWithStatus(vals, INVOICE_STATUS.DRAFT),
              )}
            >
              Save as Draft
            </Button>

            <Button
              type="button"
              disabled={isPending || selectedGr.length === 0}
              onClick={() => setConfirmPostOpen(true)}
            >
              Post Invoice
            </Button>
          </div>
        </DialogFooter>
      </form>
      <ConfirmDialog
        isOpen={confirmPostOpen}
        onClose={() => setConfirmPostOpen(false)}
        title="Post Invoice"
        description="Posting this invoice will automatically transition all associated Good Receipts to COMPLETED status and make this invoice payable. This cannot be undone."
        confirmText="Post Invoice"
        variant="default"
        onConfirm={() =>
          form.handleSubmit((vals) =>
            submitWithStatus(vals, INVOICE_STATUS.POSTED),
          )()
        }
      />

      <GoodReceiptPickerModal
        supplierId={Number(selectedSupplierId)}
        onSubmit={handlePickerSubmit}
        defaultSelected={selectedGr}
      />
    </>
  );
}

export default function InvoiceModal({
  suppliers,
}: {
  suppliers: SupplierData[];
}) {
  const { isInvoiceModalOpen, setInvoiceModalOpen, editingInvoice } =
    useUIStore();

  if (!isInvoiceModalOpen) return null;

  const isEditing = !!editingInvoice?.id;

  return (
    <Modal
      title={
        isEditing
          ? `Edit Draft Invoice: #${editingInvoice?.invoiceNumber}`
          : "Create Supplier Invoice"
      }
      description="Issue or record an invoice billed against received supplier shipments."
      isOpen={isInvoiceModalOpen}
      onClose={() => setInvoiceModalOpen(false)}
      size="lg"
    >
      <InvoiceModalContent suppliers={suppliers} />
    </Modal>
  );
}
