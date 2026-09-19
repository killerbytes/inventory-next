"use client";

import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import {
  GoodReceiptLineData,
  GoodReceiptLineInput,
  ReturnExchangeFormInput,
  ReturnExchangeFormSchema,
} from "@/schemas";
import { supplierReturnsAction } from "@/server/actions/goodReceipt.actions";
import { useUIStore } from "@/stores/uiStore";
import { UNIT_COLOR } from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowRightLeft, Loader2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import ColorBadge from "../common/ColorBadge";
import Modal from "../common/Modal";
import { Field } from "../ui/field";

export interface ExchangeItemLine {
  combinationId: number;
  name: string;
  unit: string;
  quantity: number;
  price: number;
}

export interface ReturnExchangeModalProps {
  referenceId: number;
  returns?: any[];
  salesOrder?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const returnColumnHelper = createColumnHelper<GoodReceiptLineData>();
const exchangeColumnHelper = createColumnHelper<ExchangeItemLine>();

function ReturnExchangeModalContent({
  referenceId,
  returns: initialReturns = [],
  salesOrder,
}: {
  referenceId: number;
  returns?: GoodReceiptLineInput[];
  salesOrder?: boolean;
}) {
  const router = useRouter();
  const [returnItems, setReturnItems] = useState(initialReturns);
  const [exchangeItems, setExchangeItems] = useState<ExchangeItemLine[]>([]);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const { isReturnExchangeModalOpen, setReturnExchangeModalOpen } =
    useUIStore();

  const form = useForm<ReturnExchangeFormInput>({
    defaultValues: {
      reason: "xxx",
      referenceId,
      returns: initialReturns,
    },
    resolver: zodResolver(ReturnExchangeFormSchema),
  });
  const {
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "returns",
    keyName: "fieldId",
  });

  const totalReturnAmount = useMemo(() => {
    return returnItems.reduce((sum, item) => {
      const q = Number(item.quantity || 0);
      const unitCost =
        Number(item.purchasePrice || 0) -
        (item.discount && item.quantity ? item.discount / item.quantity : 0);
      return sum + q * unitCost;
    }, 0);
  }, [returnItems]);

  const totalExchangeAmount = useMemo(() => {
    return exchangeItems.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.price || 0);
    }, 0);
  }, [exchangeItems]);

  const paymentDifference = totalExchangeAmount - totalReturnAmount;

  const handleAddExchange = (product: any) => {
    setExchangeItems((prev) => [
      ...prev,
      {
        combinationId: product.id,
        name: product.name,
        unit: product.unit || "PCS",
        quantity: 1,
        price: Number(product.price || 0),
      },
    ]);
  };

  const onSubmit = async (values: ReturnExchangeFormInput) => {
    console.log(values);

    startTransition(async () => {
      try {
        // if (salesOrder) {
        //   const activeExchanges = exchangeItems.map((item) => ({
        //     combinationId: item.combinationId,
        //     quantity: Number(item.quantity),
        //   }));

        //   const result = await returnExchangeAction(referenceId, {
        //     returns: activeReturns,
        //     exchanges: activeExchanges,
        //     reason: reason || "Customer Return/Exchange",
        //   });

        //   toast.success(
        //     result?.message ||
        //       "Sales Order Return/Exchange submitted successfully!",
        //   );
        // } else {
        await supplierReturnsAction(values.referenceId, {
          returns: values.returns,
          reason: values.reason,
        });

        toast.success("Supplier returns processed successfully!");
        // }

        // setReturnExchangeModalOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Failed to process return/exchange");
      }
    });
  };
  console.log(fields);

  const returnColumns = useMemo(
    () => [
      returnColumnHelper.display({
        id: "product",
        header: "Product",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <ColorBadge colorMap={UNIT_COLOR}>{row.original.unit}</ColorBadge>
            {row.original.nameSnapshot}
          </div>
        ),
      }),
      returnColumnHelper.display({
        header: "Delivered",
        meta: {
          align: "right",
        },
        cell: ({ row }) => Number(row.original.quantity),
      }),
      returnColumnHelper.display({
        id: "purchasePrice",
        header: "Unit Cost",
        meta: {
          align: "right",
        },
        cell: ({ row }) => {
          const price =
            Number(row.original.purchasePrice) -
            (row.original.discount || 0) / row.original.quantity;
          return formatCurrency(price);
        },
      }),
      returnColumnHelper.accessor("quantity", {
        header: "Return Qty",
        meta: {
          className: "w-20",
          align: "right",
        },
        cell: ({ row }) => {
          const item = row.original;
          return (
            <Controller
              control={form.control}
              name={`returns.${row.index}.quantity`}
              render={({ field }) => (
                <Field>
                  <Input
                    type="number"
                    {...field}
                    value={Number(field.value) || ""}
                    aria-invalid={
                      !!errors.returns?.[row.index]?.quantity?.message
                    }
                    max={item.quantity}
                  />
                </Field>
              )}
            />
          );
        },
      }),
      returnColumnHelper.display({
        id: "creditAmount",
        header: "Credit Amount",
        meta: {
          align: "right",
        },
        cell: ({ row }) => {
          const item = row.original;
          const unitPrice =
            Number(item.purchasePrice || 0) -
            (item.discount && item.quantity
              ? item.discount / item.quantity
              : 0);
          const lineAmount = Number(item.quantity || 0) * unitPrice;
          return (
            <div className="font-semibold text-emerald-600">
              {formatCurrency(lineAmount)}
            </div>
          );
        },
      }),
    ],
    [],
  );

  const exchangeColumns = useMemo(
    () => [
      exchangeColumnHelper.accessor("name", {
        header: "Replacement Product",
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.name}</span>
        ),
      }),
      exchangeColumnHelper.accessor("unit", {
        header: () => <div className="text-center">Unit</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <ColorBadge colorMap={UNIT_COLOR} className="text-xs">
              {row.original.unit}
            </ColorBadge>
          </div>
        ),
      }),
      exchangeColumnHelper.accessor("price", {
        header: () => <div className="text-right">Price</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-sm">
            {formatCurrency(row.original.price)}
          </div>
        ),
      }),
      exchangeColumnHelper.display({
        id: "quantity",
        header: () => <div className="text-right">Qty</div>,
        cell: ({ row }) => {
          const item = row.original;
          const idx = row.index;
          return (
            <div className="flex justify-end">
              <Input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setExchangeItems((prev) =>
                    prev.map((ex, i) =>
                      i === idx ? { ...ex, quantity: val } : ex,
                    ),
                  );
                }}
                className="h-8 w-24 text-right font-mono"
              />
            </div>
          );
        },
      }),
      exchangeColumnHelper.display({
        id: "total",
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono font-semibold text-sm">
            {formatCurrency(row.original.quantity * row.original.price)}
          </div>
        ),
      }),
    ],
    [],
  );
  console.log(form.formState.errors, form.getValues());

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 my-2">
      {/* Returns Table */}
      <div className="space-y-2">
        <h4 className="font-semibold text-sm text-foreground flex items-center justify-between">
          <span>Items to Return</span>
          <span className="text-xs font-mono font-normal text-muted-foreground">
            Total Credit: {formatCurrency(totalReturnAmount)}
          </span>
        </h4>

        <div className="border rounded-lg overflow-hidden">
          <DataTable columns={returnColumns} data={fields} paginate={false} />
        </div>
      </div>

      {/* Exchanges Table (Sales Order Only) */}
      {/* {salesOrder && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-foreground flex items-center justify-between">
            <span>Replacement Items (Exchange)</span>
            <span className="text-xs font-mono font-normal text-muted-foreground">
              Total Debit: {formatCurrency(totalExchangeAmount)}
            </span>
          </h4>

          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <ProductLookupInput
                onChange={(product: any) => handleAddExchange(product)}
              />
            </div>
          </div>

          {exchangeItems.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <DataTable
                columns={exchangeColumns}
                data={exchangeItems}
                paginate={false}
              />
            </div>
          )}
        </div>
      )} */}

      {/* Balance & Notes Summary */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase">
            Return Reason / Internal Notes
          </label>
          <Textarea
            placeholder="Describe reason for customer return, exchange, or supplier rejection..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 resize-none"
            rows={2}
          />
        </div>

        {salesOrder && (
          <div className="p-4 rounded-xl border bg-muted/30 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">
                Net Balance Adjustment
              </div>
              <div className="text-xs text-muted-foreground">
                {paymentDifference > 0
                  ? "Customer owes payment for higher-value replacement items."
                  : paymentDifference < 0
                    ? "Store credit / refund is owed to customer."
                    : "Even exchange: No financial balance change required."}
              </div>
            </div>
            <div
              className={`text-xl font-mono font-bold ${
                paymentDifference > 0
                  ? "text-rose-600"
                  : paymentDifference < 0
                    ? "text-emerald-600"
                    : "text-foreground"
              }`}
            >
              {paymentDifference > 0
                ? `Due: +${formatCurrency(paymentDifference)}`
                : paymentDifference < 0
                  ? `Refund: -${formatCurrency(Math.abs(paymentDifference))}`
                  : "₱0.00"}
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setReturnExchangeModalOpen(false)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Undo2 className="h-4 w-4" />
          )}
          {salesOrder ? "Submit Return & Exchange" : "Process Supplier Return"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ReturnExchangeModal({
  referenceId,
  returns,
  salesOrder,
  isOpen,
  onClose,
}: ReturnExchangeModalProps) {
  const isSalesOrder = Boolean(salesOrder);
  const { isReturnExchangeModalOpen, setReturnExchangeModalOpen } =
    useUIStore();

  const isModalOpen = isOpen !== undefined ? isOpen : isReturnExchangeModalOpen;

  if (!isModalOpen) return null;

  return (
    <Modal
      title={
        isSalesOrder ? (
          <>
            <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
            Return & Exchange (Sales Order #{referenceId})
          </>
        ) : (
          <>
            <Undo2 className="h-5 w-5 text-amber-600" />
            Supplier Return (Good Receipt #{referenceId})
          </>
        )
      }
      description="Return items and exchange them for new items."
      isOpen={isModalOpen}
      onClose={() => setReturnExchangeModalOpen(false)}
      size="lg"
    >
      <ReturnExchangeModalContent
        referenceId={referenceId}
        returns={returns}
        salesOrder={isSalesOrder}
      />
    </Modal>
  );
}
