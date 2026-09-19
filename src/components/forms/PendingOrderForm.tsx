"use client";

import { DataTable } from "@/components/common/DataTable";
import DatePicker from "@/components/common/DatePicker";
import NumberInput from "@/components/common/NumberInput";
import LineColumn from "@/components/forms/LineColumn";
import ProductLookupInput from "@/components/forms/ProductLookupInput";

import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { GoodReceiptInput, SupplierData } from "@/schemas";
import { goodReceiptItemDefault, UNIT_COLOR } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import React from "react";
import {
  Controller,
  useFieldArray,
  UseFormReturn,
  useWatch,
} from "react-hook-form";
import ColorBadge from "../common/ColorBadge";
import { Button } from "../ui/button";
import { Field, FieldError } from "../ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import FormField from "./FormField";
import FormTableFooter from "./FormTableFooter";

const columnHelper = createColumnHelper<any>();

export default function PendingOrderForm({
  form,
  suppliers = [],
}: {
  form: UseFormReturn<GoodReceiptInput>;
  suppliers: SupplierData[];
}) {
  const {
    formState: { errors },
  } = form;
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "goodReceiptLines",
    keyName: "fieldId",
  });

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
      columnHelper.accessor("unit", {
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
        cell: ({ row }) => (
          <Controller
            name={`goodReceiptLines.${row.index}.purchasePrice`}
            control={form.control}
            render={({ field }) => (
              <Field>
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
        ),
      }),
      columnHelper.accessor("totalAmount", {
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
    [errors.goodReceiptLines, form, remove],
  );

  const footerValues = useWatch({
    control: form.control,
    name: "goodReceiptLines",
  });

  return (
    <div className="space-y-4">
      <div className="w-full flex flex-col gap-4 items-start md:flex-row">
        <FormField
          form={form}
          name="supplierId"
          label="Supplier"
          render={({ field, fieldState }) => (
            <Select
              {...field}
              onValueChange={field.onChange}
              items={suppliers.map((s) => ({
                value: String(s.id),
                label: s.name,
              }))}
            >
              <SelectTrigger
                className="w-full"
                aria-invalid={fieldState.invalid}
              >
                <SelectValue>
                  {field.value === 0
                    ? "Select Supplier"
                    : suppliers.find((s) => s.id === field.value)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
      <Controller
        control={form.control}
        name="goodReceiptLines"
        render={() => (
          <Field>
            <DataTable
              data={fields}
              columns={columns}
              renderFooter={() => (
                <FormTableFooter
                  values={footerValues || []}
                  onAdd={() => append(goodReceiptItemDefault)}
                />
              )}
            />
            <FieldError>
              {errors?.goodReceiptLines?.root?.message ||
                errors?.goodReceiptLines?.message}
            </FieldError>
          </Field>
        )}
      />
    </div>
  );
}
