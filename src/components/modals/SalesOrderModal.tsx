"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import {
  CustomerData,
  SalesOrderInput,
  SalesOrderInputSchema,
  SalesOrderItemInput,
} from "@/schemas";
import { createSalesOrderAction } from "@/server/actions/salesOrder.actions";
import { useUIStore } from "@/stores/uiStore";
import {
  MODE_OF_PAYMENT,
  MODE_OF_PAYMENT_OPTIONS,
  ORDER_STATUS,
  UNIT_COLOR,
} from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import React, { useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import ColorBadge from "../common/ColorBadge";
import DataTable from "../common/DataTable";
import DatePicker from "../common/DatePicker";
import Modal from "../common/Modal";
import NumberInput from "../common/NumberInput";
import FormField from "../forms/FormField";
import FormTableFooter from "../forms/FormTableFooter";
import LineColumn from "../forms/LineColumn";
import ProductLookupInput from "../forms/ProductLookupInput";
import { Field, FieldError } from "../ui/field";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

const columnHelper = createColumnHelper<SalesOrderItemInput>();

function SalesOrderModalContent({ customers }: { customers: CustomerData[] }) {
  const [isPending, startTransition] = useTransition();
  const { setSalesOrderModalOpen } = useUIStore();

  const form = useForm<SalesOrderInput>({
    resolver: zodResolver(SalesOrderInputSchema),
    defaultValues: {
      customerId: 0,
      orderDate: new Date(),
      modeOfPayment: MODE_OF_PAYMENT.CASH,
      status: ORDER_STATUS.RECEIVED,
      isDelivery: false,
      deliveryDate: new Date(),
      dueDate: new Date(),
      salesOrderItems: [
        {
          combinationId: 0,
          quantity: 1,
          discount: 0,
        },
      ],
    },
  });

  const {
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "salesOrderItems",
    keyName: "fieldId",
  });

  const onSubmit = async (values: SalesOrderInput) => {
    console.log(values);

    startTransition(async () => {
      try {
        await createSalesOrderAction(values);
        toast.success(`Sales order created successfully!`);
        setSalesOrderModalOpen(false);
      } catch (error: any) {
        toast.error(error.message || "Failed to create sales order.");
      }
    });
  };
  console.log(form.getValues(), errors);

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
            name={`salesOrderItems.${row.index}.quantity`}
            render={({ field }) => (
              <Input
                type="number"
                {...field}
                aria-invalid={
                  !!errors.salesOrderItems?.[row.index]?.quantity?.message
                }
              />
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
              name="salesOrderItems"
            >
              {(value: any) =>
                value.combination?.unit && (
                  <ColorBadge colorMap={UNIT_COLOR}>
                    {value.combination?.unit}
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
            `salesOrderItems.${row.index}.combination`,
          );

          return (
            <Controller
              control={form.control}
              name={`salesOrderItems.${row.index}.combinationId`}
              render={({ field }) => (
                <ProductLookupInput
                  selected={combination}
                  aria-invalid={
                    !!errors.salesOrderItems?.[row.index]?.combinationId
                      ?.message
                  }
                  exclude={
                    form
                      .getValues("salesOrderItems")
                      ?.map((item: any) => item?.combination?.id ?? 0) || []
                  }
                  noBreakPacks
                  onChange={(value) => {
                    field.onChange(value.id);
                    console.log(value);

                    form.setValue(
                      `salesOrderItems.${row.index}.combination`,
                      value,
                    );
                  }}
                />
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
            name={`salesOrderItems.${row.index}.discount`}
            control={form.control}
            render={({ field }) => (
              <NumberInput {...field} type="currency" tabIndex={-1} />
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
            name={`salesOrderItems.${row.index}.discountNote`}
            control={form.control}
            render={({ field }) => (
              <Input
                {...field}
                value={field.value ? String(field.value) : ""}
                tabIndex={-1}
              />
            )}
          />
        ),
      }),
      columnHelper.accessor("combination.price", {
        header: "Price",
        meta: {
          className: "text-right min-w-[100px] w-[110px]",
          headerClassName: "text-right",
        },
        cell: ({ row }) => {
          return (
            <LineColumn
              index={row.index}
              control={form.control}
              name="salesOrderItems"
            >
              {(value: any) => formatCurrency(value?.combination?.price || 0)}
            </LineColumn>
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
            name="salesOrderItems"
          >
            {(value: any) => {
              const q = Number(value?.quantity) || 0;
              const p =
                Number(value?.combination?.price || 0) -
                (q > 0 ? Number(value?.discount || 0) / q : 0);
              const total = q * p || 0;
              return formatCurrency(total);
            }}
          </LineColumn>
        ),
      }),
    ],
    [errors.salesOrderItems, form, remove],
  );

  const footerValues = useWatch({
    control: form.control,
    name: "salesOrderItems",
  });

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          form={form}
          name="customerId"
          label="Customer"
          render={({ field, fieldState }) => (
            <Select
              {...field}
              onValueChange={field.onChange}
              items={customers.map((s) => ({
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
                    ? "Select Customer"
                    : customers.find((s) => s.id === field.value)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <div className="grid grid-cols-3 gap-4">
          <FormField form={form} name="salesOrderNumber" label="Receipt No" />
          <FormField
            form={form}
            name="orderDate"
            label="Order Date"
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
            name="modeOfPayment"
            label="Payment Mode"
            render={({ field, fieldState }) => (
              <Select {...field} onValueChange={field.onChange}>
                <SelectTrigger
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue>
                    {field.value === 0
                      ? "Select Payment Mode"
                      : MODE_OF_PAYMENT_OPTIONS.find(
                          (s) => s.value === field.value,
                        )?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MODE_OF_PAYMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <FormField
          form={form}
          name="notes"
          label="Notes"
          render={({ field, fieldState }) => (
            <Textarea {...field} aria-invalid={fieldState.invalid} />
          )}
        />

        <Controller
          control={form.control}
          name="salesOrderItems"
          render={() => (
            <Field>
              <DataTable
                data={fields}
                columns={columns}
                renderFooter={() => (
                  <FormTableFooter
                    values={footerValues || []}
                    onAdd={() =>
                      append({
                        combinationId: 0,
                        quantity: 1,
                        discount: 0,
                        discountNote: "",
                        combination: { productId: 0, unit: "" },
                      })
                    }
                  />
                )}
              />
              <FieldError>
                {form.formState.errors.salesOrderItems?.message}
              </FieldError>
            </Field>
          )}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSalesOrderModalOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? "Creating..." : "Create Sales Order"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export default function SalesOrderModal({
  customers = [],
}: {
  customers?: CustomerData[];
}) {
  const { isSalesOrderModalOpen, setSalesOrderModalOpen } = useUIStore();

  if (!isSalesOrderModalOpen) return null;

  return (
    <Modal
      title="Sales Order"
      description="Create a new sales order."
      isOpen={isSalesOrderModalOpen}
      onClose={() => setSalesOrderModalOpen(false)}
      size="lg"
    >
      <SalesOrderModalContent customers={customers} />
    </Modal>
  );
}
