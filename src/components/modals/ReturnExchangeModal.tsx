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
import { returnExchangeAction } from "@/server/actions/salesOrder.actions";
import { useUIStore } from "@/stores/uiStore";
import { UNIT_COLOR } from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { ArrowRightLeft, Loader2, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import ColorBadge from "../common/ColorBadge";
import Modal from "../common/Modal";
import { Field } from "../ui/field";
import LineColumn from "../forms/LineColumn";
import ProductLookupInput from "../forms/ProductLookupInput";
import FormField from "../forms/FormField";

export interface ExchangeItemLine {
  combinationId: number;
  name?: string | null;
  unit?: string | null;
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
  const [isPending, startTransition] = useTransition();
  const { setReturnExchangeModalOpen } = useUIStore();

  const form = useForm<ReturnExchangeFormInput>({
    defaultValues: {
      reason: "",
      referenceId,
      returns: initialReturns,
      exchanges: [],
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

  const {
    fields: exchangeFields,
    append: appendExchange,
    remove: removeExchange,
  } = useFieldArray({
    control: form.control,
    name: "exchanges",
    keyName: "fieldId",
  });

  const watchedReturns = useWatch({
    control: form.control,
    name: "returns",
  });

  const watchedExchanges = useWatch({
    control: form.control,
    name: "exchanges",
  });
  console.log(form.getValues(), form.formState.errors);
  const totalReturnAmount = useMemo(() => {
    return (watchedReturns || []).reduce((sum, item, idx) => {
      const q = Number(item?.quantity || 0);
      const original = fields[idx] || initialReturns[idx];
      const unitCost =
        Number(original?.purchasePrice || 0) -
        (original?.discount && original?.quantity
          ? original.discount / original.quantity
          : 0);
      return sum + q * unitCost;
    }, 0);
  }, [watchedReturns, fields, initialReturns]);

  const totalExchangeAmount = useMemo(() => {
    return (watchedExchanges || []).reduce((sum, item) => {
      return sum + Number(item?.quantity || 0) * Number(item?.price || 0);
    }, 0);
  }, [watchedExchanges]);

  const paymentDifference = totalExchangeAmount - totalReturnAmount;

  const handleAddExchange = (product: any) => {
    appendExchange({
      combinationId: product.id,
      name: product.name,
      unit: product.unit || "PCS",
      quantity: 1,
      price: Number(product.price || 0),
    });
  };

  /**
   * Removes an exchange item line by its index in the exchanges field array.
   *
   * @param index - Row index of the exchange item to remove.
   */
  const handleRemoveExchange = useCallback(
    (index: number) => {
      removeExchange(index);
    },
    [removeExchange],
  );

  const onSubmit = async (values: ReturnExchangeFormInput) => {
    startTransition(async () => {
      try {
        if (salesOrder) {
          const activeReturns = values.returns.map((item) => ({
            combinationId: item.combinationId,
            quantity: Number(item.quantity),
          }));
          const activeExchanges = (values.exchanges || []).map((item) => ({
            combinationId: item.combinationId,
            quantity: Number(item.quantity),
          }));

          const result = await returnExchangeAction(referenceId, {
            returns: activeReturns,
            exchanges: activeExchanges,
            reason: values.reason || "Customer Return/Exchange",
          });

          toast.success(
            result?.message ||
            "Sales Order Return/Exchange submitted successfully!",
          );
        } else {
          await supplierReturnsAction(values.referenceId, {
            returns: values.returns,
            reason: values.reason,
          });

          toast.success("Supplier returns processed successfully!");
        }

        setReturnExchangeModalOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Failed to process return/exchange");
      }
    });
  };

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
          return (
            <LineColumn
              index={row.index}
              control={form.control}
              name="returns"
            >
              {(value: any) => {
                const returnQty = Number(value?.quantity || 0);
                const lineAmount = returnQty * unitPrice;
                return (
                  <div className="font-semibold text-emerald-600">
                    {formatCurrency(lineAmount)}
                  </div>
                );
              }}
            </LineColumn>
          );
        },
      }),
    ],
    [form.control, errors.returns],
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
          return (
            <div className="flex justify-end">
              <Controller
                control={form.control}
                name={`exchanges.${row.index}.quantity`}
                render={({ field }) => (
                  <Input
                    type="number"
                    min="1"
                    {...field}
                    value={Number(field.value) || ""}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      field.onChange(val);
                    }}
                    className="h-8 w-24 text-right font-mono"
                  />
                )}
              />
            </div>
          );
        },
      }),
      exchangeColumnHelper.display({
        id: "total",
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <LineColumn
            index={row.index}
            control={form.control}
            name="exchanges"
          >
            {(value: any) => {
              const q = Number(value?.quantity || 0);
              const p = Number(value?.price ?? row.original.price ?? 0);
              return (
                <div className="text-right font-mono font-semibold text-sm">
                  {formatCurrency(q * p)}
                </div>
              );
            }}
          </LineColumn>
        ),
      }),
      exchangeColumnHelper.display({
        id: "actions",
        header: () => <div className="w-8"></div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemoveExchange(row.index)}
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      }),
    ],
    [form.control, handleRemoveExchange],
  );

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
      {salesOrder && (
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

          {exchangeFields.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <DataTable
                columns={exchangeColumns}
                data={exchangeFields}
                paginate={false}
              />
            </div>
          )}
        </div>
      )}

      {/* Balance & Notes Summary */}
      <div className="space-y-4">
        <div>
          <FormField
            form={form}
            name="reason"
            label="Return Reason / Internal Notes"
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder="Describe reason for customer return, exchange, or supplier rejection..."
                rows={2}
              />
            )}
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
              className={`text-xl font-mono font-bold ${paymentDifference > 0
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
  onClose,
}: ReturnExchangeModalProps) {
  const isSalesOrder = Boolean(salesOrder);
  const { isReturnExchangeModalOpen, setReturnExchangeModalOpen } =
    useUIStore();


  if (!isReturnExchangeModalOpen) return null;

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
      isOpen={isReturnExchangeModalOpen}
      onClose={() => {
        onClose?.()
        setReturnExchangeModalOpen(false)
      }}
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
