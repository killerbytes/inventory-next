"use client";

import { DataTable } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, groupSubItems } from "@/lib/utils";
import {
  ProductCombinationData,
  ProductCombinationUpdate,
  ProductCombinationUpdateSchema,
  ProductData,
  VariantTypeData,
} from "@/schemas";
import { updateProductCombinationsAction } from "@/server/actions/product.actions";
import { useUIStore } from "@/stores/uiStore";
import { UNIT_COLOR, UNIT_OPTIONS } from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import { ColumnDef } from "@tanstack/react-table";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import React, { useMemo, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import ColorBadge from "../common/ColorBadge";
import Modal from "../common/Modal";
import NumberInput from "../common/NumberInput";
import FormField from "../forms/FormField";
import { Checkbox } from "../ui/checkbox";
import { Field, FieldError } from "../ui/field";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const FormCombinationsSchema = z.object({
  productId: z.coerce.number().positive(),
  combinations: z.array(ProductCombinationUpdateSchema),
});
interface FormCombinations {
  productId: number;
  combinations: ProductCombinationUpdate[];
}

function CombinationModalContent({ product }: { product: ProductData }) {
  const [isPending, startTransition] = useTransition();
  const variants: VariantTypeData[] = product?.variants || [];
  const { setCombinationModalOpen } = useUIStore();

  const combinations = React.useMemo(() => {
    const combinations: ProductCombinationUpdate[] = [];
    const getSubItem = (i: any) => {
      combinations.push(i);
      i?.subItem?.forEach((j: any) => {
        getSubItem(j);
      });
    };
    groupSubItems(product.combinations).forEach((i) => {
      getSubItem(i);
    });

    return combinations;
  }, [product.combinations]);

  const form = useForm<FormCombinations>({
    defaultValues: {
      productId: product?.id,
      combinations: combinations,
    },
    resolver: zodResolver(FormCombinationsSchema),
  });

  const { control } = form;

  const { fields, append, remove } = useFieldArray({
    name: "combinations",
    control,
    keyName: "keyId",
  });

  const handleBatchSubmit = async ({
    productId,
    combinations,
  }: FormCombinations) => {
    startTransition(async () => {
      try {
        console.log(product, combinations);

        await updateProductCombinationsAction(productId, combinations);
        toast.success("Combinations saved successfully");
        // onClose();
      } catch (err: any) {
        console.error("Batch combination update error:", err);
        toast.error(err?.message || "Failed to save combinations");
      }
    });
  };
  console.log(form.formState.errors);

  const columns = useMemo<ColumnDef<any>[]>(() => {
    const baseCols: ColumnDef<any>[] = [
      {
        id: "delete",
        header: "#",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => remove(row.index)}
            disabled={
              fields.length === 1 ||
              Number(row.original.inventory?.quantity || 0) > 0
            }
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ];

    const variantCols: ColumnDef<ProductCombinationData>[] = variants.map(
      (variant: any, vIdx: number) => ({
        accessorKey: "values.values." + variant.name,
        header: variant.name,
        meta: {
          className: "min-w-[120px]",
        },
        cell: ({ row }) => {
          return (
            <Controller
              name={`combinations.${row.index}.values.${vIdx}`}
              control={form.control}
              render={({ field, fieldState }) => (
                <Select
                  items={variant.values.map(
                    (v: { value: string; id: string }) => ({
                      label: v.value,
                      value: v.id,
                    }),
                  )}
                  value={field.value}
                  onValueChange={(e) => {
                    field.onChange(variant.values.find((v: any) => v.id === e));
                  }}
                >
                  <SelectTrigger
                    aria-invalid={fieldState.invalid}
                    className="w-full"
                  >
                    <SelectValue></SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>{variant.name}</SelectLabel>
                      {variant.values.map((val: any) => (
                        <SelectItem key={val.id} value={val.id}>
                          {val.value}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
          );
        },
      }),
    );

    const tailCols: ColumnDef<ProductCombinationData>[] = [
      {
        accessorKey: "unit",
        header: "Unit",
        cell: ({ row }) => (
          <FormField
            name={`combinations.${row.index}.unit`}
            form={form}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue>
                    {(value) => (
                      <ColorBadge colorMap={UNIT_COLOR}>
                        {String(value)}
                      </ColorBadge>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Unit</SelectLabel>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        <ColorBadge colorMap={UNIT_COLOR}>{u.label}</ColorBadge>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
        ),
      },
      {
        accessorKey: "isBreakPackOfId",
        header: "Parent Pack",
        cell: ({ row, table }) => {
          const type = variants?.find((item) => item.isBreakpackFilter);
          let options: ProductCombinationData[] = [];
          const allOriginalData = table
            .getRowModel()
            .rows.map((row) => row.original);

          const selectedParentIds = allOriginalData
            .filter((_, index) => index !== row.index)
            .map((r) => r.isBreakPackOfId)
            .filter(Boolean);

          if (type) {
            const f = row.original.values?.find(
              (v) => v.variantTypeId === type.id,
            );
            options = allOriginalData.filter(
              (i) =>
                i.values?.find((v) => v.id === f?.id) &&
                !selectedParentIds.includes(i.id),
            );
          } else {
            options = allOriginalData.filter(
              (i) =>
                i.id !== row.original.id && !selectedParentIds.includes(i.id),
            );
          }

          return (
            <FormField
              name={`combinations.${row.index}.isBreakPackOfId`}
              form={form}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={options.map((i) => ({ label: i.unit, value: i.id }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value) => {
                        const selected = options.find((r) => r.id === value);
                        if (!selected) return value;
                        return (
                          <>
                            <ColorBadge colorMap={UNIT_COLOR}>
                              {selected?.unit}
                            </ColorBadge>
                            {selected?.values?.[0]?.value}
                          </>
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="">(None - Main)</SelectItem>
                      {options.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          <ColorBadge colorMap={UNIT_COLOR}>
                            {r.unit}
                          </ColorBadge>
                          {r.values?.[0]?.value} {r.values?.[1]?.value}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
          );
        },
      },
      {
        accessorKey: "price",
        header: () => <div className="text-right">Selling Price</div>,
        meta: {
          className: "w-28",
        },
        cell: ({ row }) => (
          <FormField
            name={`combinations.${row.index}.price`}
            form={form}
            render={({ field }) => (
              <NumberInput {...field} type="currency" className="text-right!" />
            )}
          />
        ),
      },
      {
        accessorKey: "inventory.averagePrice",
        header: () => <div className="text-right">Avg Cost</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs text-muted-foreground">
            {formatCurrency(row.original.inventory?.averagePrice || 0)}
          </div>
        ),
      },
      {
        accessorKey: "inventory.quantity",
        header: () => <div className="text-right">Stock Qty</div>,
        meta: {
          align: "right",
        },
        cell: ({ row }) => (
          <Badge>{Number(row.original.inventory?.quantity || 0)}</Badge>
        ),
      },
      {
        accessorKey: "conversionFactor",
        header: () => <div className="text-right">Conversion</div>,
        meta: {
          className: "w-24",
        },
        cell: ({ row }) => (
          <FormField
            name={`combinations.${row.index}.conversionFactor`}
            form={form}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                value={Number(field.value)}
                className="text-right"
              />
            )}
          />
        ),
      },
      {
        accessorKey: "reorderLevel",
        header: () => <div className="text-right">Reorder Level</div>,
        meta: {
          className: "w-24",
        },
        cell: ({ row }) => (
          <FormField
            name={`combinations.${row.index}.reorderLevel`}
            form={form}
            render={({ field }) => (
              <Input {...field} type="number" className="text-right" />
            )}
          />
        ),
      },
      {
        accessorKey: "isBreakPack",
        header: "BreakPack",
        meta: {
          align: "right",
        },
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Controller
              name={`combinations.${row.index}.isBreakPack`}
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal" className="justify-center">
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={(e) => field.onChange(e)}
                  />
                </Field>
              )}
            />
          </div>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <FormField
              name={`combinations.${row.index}.isActive`}
              form={form}
              render={({ field }) => (
                <Field orientation="horizontal" className="justify-center">
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={(e) => field.onChange(e)}
                  />
                </Field>
              )}
            />
          </div>
        ),
      },
    ];

    return [...baseCols, ...variantCols, ...tailCols];
  }, [form, variants]);

  const formWatch = useWatch({
    control,
    name: "combinations",
  });
  return (
    <>
      <form
        onSubmit={form.handleSubmit(handleBatchSubmit)}
        className="flex-1 flex flex-col space-y-4 overflow-hidden py-2"
      >
        <div className="space-y-2">
          <Controller
            name="combinations"
            control={form.control}
            render={({ fieldState }) => (
              <>
                <DataTable columns={columns} data={fields} />
                <FieldError>{fieldState.error?.message}</FieldError>
              </>
            )}
          />
        </div>
      </form>
      <DialogFooter className="flex justify-between! items-center">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full shadow-sm"
          onClick={() =>
            append({
              unit: product.baseUnit,
              productId: product.id,
              conversionFactor: 1,
              reorderLevel: 10,
              price: 0,
              isBreakPack: false,
              isActive: true,
              values: variants.map((v: any) => ({
                id: 0,
                value: "",
                variantTypeId: 0,
              })),
            })
          }
          title="Add New Combination Row"
        >
          <Plus className="h-4 w-4" />
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCombinationModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="gap-2"
            onClick={form.handleSubmit(handleBatchSubmit, (e) => {
              console.log(form.getValues(), e);
            })}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </DialogFooter>
      {/* {JSON.stringify(formWatch, null, 2)} */}
    </>
  );
}

export default function CombinationModal({
  product,
}: {
  product: ProductData;
}) {
  const { isCombinationModalOpen, setCombinationModalOpen } = useUIStore();

  if (!isCombinationModalOpen) return null;

  return (
    <Modal
      title={
        <div>
          Product: <span className="text-primary">{product?.name}</span>{" "}
          <Badge variant="outline">
            {product?.category?.name || "Uncategorized"}
          </Badge>
        </div>
      }
      description="System user management, permission roles, and account statuses."
      isOpen={isCombinationModalOpen}
      onClose={() => setCombinationModalOpen(false)}
      size="xl"
    >
      <CombinationModalContent product={product} />
    </Modal>
  );
}
