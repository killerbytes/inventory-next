"use client";

import { DataTable } from "@/components/common/DataTable";
import DatePicker from "@/components/common/DatePicker";
import NumberInput from "@/components/common/NumberInput";
import LineColumn from "@/components/forms/LineColumn";
import ProductLookupInput from "@/components/forms/ProductLookupInput";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { GoodReceiptInputSchema, GoodReceiptLineWithCombination, GoodReceiptModalForm, SupplierData } from "@/schemas";
import { UNIT_COLOR } from "@/constants";
import { createColumnHelper } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import React from "react";
import {
  Controller,
  UseFormReturn,
} from "react-hook-form";
import { getLastPurchasePricesAction } from "@/server/actions/goodReceipt.actions";
import { useUIStore } from "@/stores/uiStore";
import { Autocomplete, AutocompleteValue } from "../common/Autocomplete";
import ColorBadge from "../common/ColorBadge";
import { Button } from "../ui/button";
import { Field, FieldError } from "../ui/field";
import { Textarea } from "../ui/textarea";
import FormField from "./FormField";
import z from "zod";
import { ScrollArea } from "../ui/scroll-area";





const columnHelper = createColumnHelper<GoodReceiptLineWithCombination>();

export default function PendingOrderForm({
  form,
  suppliers = [],
  fields,
  remove
}: {
  form: UseFormReturn<GoodReceiptModalForm>;
  suppliers: SupplierData[];
  fields: GoodReceiptLineWithCombination[];
  remove: (index: number) => void;
}) {
  const {
    formState: { errors },
  } = form;

  const { editingGoodReceipt } = useUIStore();
  const currentGoodReceiptId = editingGoodReceipt?.id
    ? Number(editingGoodReceipt.id)
    : undefined;

  const supplierId = form.watch("supplierId");
  const goodReceiptLines = form.watch("goodReceiptLines");

  const [lastPrices, setLastPrices] = React.useState<
    Record<
      number,
      {
        combinationId: number;
        lastPrice: number;
        receiptDate: Date;
        supplierId: number;
        isSupplierMatch: boolean;
      }
    >
  >({});

  const comboIds = React.useMemo(() => {
    return Array.from(
      new Set(
        (goodReceiptLines || [])
          .map((line: any) =>
            Number(line?.combinationId || line?.combination?.id),
          )
          .filter((id: number) => id > 0),
      ),
    );
  }, [goodReceiptLines]);

  React.useEffect(() => {
    let isMounted = true;
    if (comboIds.length === 0) return;

    getLastPurchasePricesAction({
      combinationIds: comboIds,
      supplierId: supplierId ? Number(supplierId) : undefined,
      excludeGoodReceiptId: currentGoodReceiptId,
    })
      .then((data: any) => {
        if (isMounted && data) {
          setLastPrices(data);
        }
      })
      .catch((err: any) => {
        console.error("Failed to fetch last purchase prices", err);
      });

    return () => {
      isMounted = false;
    };
  }, [comboIds.join(","), supplierId, currentGoodReceiptId]);

  const columns = React.useMemo(
    () => [
      columnHelper.display({
        id: "actions",
        header: "",
        meta: {
          className: "w-0",
        },
        cell: ({ row }) => (
          <Button
            onClick={() => remove(row.index)}
            variant="outline"
            type="button"
            tabIndex={-1}
            size="icon-xs"
          >
            <Trash2 className="h-4 w-4 text-rose-600 hover:text-rose-800" />
          </Button>
        ),
      }),
      columnHelper.accessor("quantity", {
        header: "Quantity",
        meta: {
          headerClassName: "text-right",
          className: "text-right w-20",
        },
        cell: ({ row }) => (
          <Controller
            control={form.control}
            name={`goodReceiptLines.${row.index}.quantity`}
            render={({ field }) => (
              <Field>
                <Input
                  type="number"
                  {...field}
                  aria-invalid={
                    !!errors.goodReceiptLines?.[row.index]?.quantity?.message
                  }
                />
              </Field>
            )}
          />
        ),
      }),
      columnHelper.accessor("combination.unit", {
        header: "Unit",
        meta: {
          className: "w-15",
        },
        cell: ({ row }) => {
          return (
            <LineColumn
              index={row.index}
              control={form.control}
              name="goodReceiptLines"
            >
              {(value: any) =>
                value?.combination?.unit && (
                  <ColorBadge colorMap={UNIT_COLOR}>
                    {value.combination.unit}
                  </ColorBadge>
                )
              }
            </LineColumn>
          );
        },
      }),
      columnHelper.accessor("combinationId", {
        header: "Product",
        cell: ({ row }) => {
          const combination = form.watch(
            `goodReceiptLines.${row.index}.combination`,
          );

          return (
            <Controller
              control={form.control}
              name={`goodReceiptLines.${row.index}.combinationId`}
              render={({ field }) => (
                <Field>
                  <ProductLookupInput
                    selected={combination}
                    aria-invalid={
                      !!errors.goodReceiptLines?.[row.index]?.combinationId
                        ?.message
                    }
                    exclude={
                      form
                        .getValues("goodReceiptLines")
                        ?.map((item: any) => item?.combination?.id ?? 0) || []
                    }
                    noBreakPacks
                    onChange={(value) => {
                      field.onChange(value.id);

                      form.setValue(
                        `goodReceiptLines.${row.index}.combination`,
                        value,
                      );

                      getLastPurchasePricesAction({
                        combinationIds: [Number(value.id)],
                        supplierId: supplierId ? Number(supplierId) : undefined,
                        excludeGoodReceiptId: currentGoodReceiptId,
                      }).then((res: any) => {
                        if (res && res[value.id]) {
                          setLastPrices((prev) => ({
                            ...prev,
                            [value.id]: res[value.id],
                          }));
                        }
                      });
                    }}
                  />
                </Field>
              )}
            />
          );
        },
      }),
      columnHelper.accessor("discount", {
        header: "Discount",
        meta: {
          className: "text-right w-32",
          type: "currency",
        },
        cell: ({ row }) => (
          <Controller
            name={`goodReceiptLines.${row.index}.discount`}
            control={form.control}
            render={({ field }) => (
              <Field>
                <NumberInput {...field} type="currency" tabIndex={-1} />
              </Field>
            )}
          />
        ),
      }),
      columnHelper.accessor("discountNote", {
        header: "Discount Note",
        meta: {
          className: "w-50",
        },
        cell: ({ row }) => (
          <Controller
            name={`goodReceiptLines.${row.index}.discountNote`}
            control={form.control}
            render={({ field }) => (
              <Field>
                <Input
                  {...field}
                  value={field.value ? String(field.value) : ""}
                  tabIndex={-1}
                />
              </Field>
            )}
          />
        ),
      }),
      columnHelper.accessor("purchasePrice", {
        header: "Price",
        meta: {
          className: "text-right min-w-[100px] w-[110px]",
          headerClassName: "text-right",
        },
        cell: ({ row }) => {
          const comboId =
            form.watch(`goodReceiptLines.${row.index}.combinationId`) ||
            row.original.combinationId ||
            row.original.combination?.id;
          const lastPriceInfo = comboId ? lastPrices[Number(comboId)] : null;
          const hasLastPrice =
            lastPriceInfo &&
            lastPriceInfo.lastPrice !== undefined &&
            lastPriceInfo.lastPrice !== null;

          return (
            <div className="flex flex-col items-end">
              <Controller
                name={`goodReceiptLines.${row.index}.purchasePrice`}
                control={form.control}
                render={({ field }) => (
                  <Field className="w-full">
                    <NumberInput
                      {...field}
                      type="currency"
                      aria-invalid={
                        !!errors.goodReceiptLines?.[row.index]?.purchasePrice
                          ?.message
                      }
                    />
                  </Field>
                )}
              />
              {comboId ? (
                hasLastPrice ? (
                  <button
                    type="button"
                    data-last-price={lastPriceInfo.lastPrice}
                    tabIndex={-1}
                    onClick={() => {
                      form.setValue(
                        `goodReceiptLines.${row.index}.purchasePrice`,
                        lastPriceInfo.lastPrice,
                        { shouldValidate: true, shouldDirty: true },
                      );
                    }}
                    title={`Click to apply last price (${lastPriceInfo.isSupplierMatch ? "This Supplier" : "Any Supplier"})`}
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors text-right cursor-pointer mt-0.5 truncate max-w-full font-medium hover:underline underline-offset-2"
                  >
                    Last: {formatCurrency(lastPriceInfo.lastPrice)}
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground/50 text-right mt-0.5 select-none">
                    Last: —
                  </span>
                )
              ) : null}
            </div>
          );
        },
      }),
      columnHelper.display({
        header: "Amount",
        meta: {
          className: "text-right w-20",
          headerClassName: "text-right",
        },
        cell: ({ row }) => (
          <LineColumn
            index={row.index}
            control={form.control}
            name="goodReceiptLines"
          >
            {(value: any) => {
              const q = Number(value?.quantity) || 0;
              const p =
                Number(value?.purchasePrice) -
                (q > 0 ? Number(value?.discount || 0) / q : 0);
              const total = q * p || 0;
              return formatCurrency(total);
            }}
          </LineColumn>
        ),
      }),
    ],
    [errors.goodReceiptLines, form, remove, lastPrices, supplierId],
  );



  return (
    <div className="space-y-4">
      <div className="w-full flex flex-col gap-4 items-start md:flex-row">
        <FormField
          form={form}
          name="supplierId"
          label="Supplier"
          render={({ field, fieldState }) => (
            <Autocomplete
              options={suppliers || []}
              placeholder="Supplier"
              aria-invalid={fieldState.invalid}
              onChange={(value) => {
                form.setValue("supplierId", Number(value.id), {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
            >
              <AutocompleteValue
                value={
                  suppliers?.find((supplier) => supplier.id === field.value)
                    ?.name
                }
              />
            </Autocomplete>
          )}
        />
        <FormField
          form={form}
          name="receiptDate"
          label="Receipt Date"
          render={({ field }) => (
            <DatePicker
              value={
                field.value
                  ? field.value instanceof Date
                    ? field.value.toISOString()
                    : String(field.value)
                  : undefined
              }
              onChange={(val) => field.onChange(val ? new Date(val) : null)}
            />
          )}
        />
        <FormField
          form={form}
          name="referenceNo"
          label="DDR / Reference No"
          placeholder="DDR / Reference No"
        />
      </div>

      <FormField
        form={form}
        name="internalNotes"
        label="Internal Notes"
        render={({ field }) => (
          <Textarea
            placeholder="Enter some internal notes..."
            {...field}
            value={field.value ?? ""}
          />
        )}
      />
      <ScrollArea className="h-[40vh]">
        <Controller
          control={form.control}
          name="goodReceiptLines"
          render={() => (
            <Field>
              <DataTable
                data={fields}
                columns={columns}
              />

              <FieldError>
                {errors?.goodReceiptLines?.root?.message ||
                  errors?.goodReceiptLines?.message}
              </FieldError>
            </Field>
          )}
        />
      </ScrollArea>

    </div>
  );
}
