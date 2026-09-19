"use client";

import ConfirmDialog from "@/components/common/ConfirmDialog";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, X } from "lucide-react";
import React, { useState } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "../ui/field";
import FormField from "./FormField";

export interface VariantValueItem {
  id?: number;
  value: string;
  variantTypeId?: number;
}

export interface VariantTypeFormInput {
  id?: number;
  name: string;
  isBreakpackFilter?: boolean;
  values: VariantValueItem[];
}

export default function VariantTypesForm({
  form,
  onSubmit,
  selected,
  onDelete,
}: {
  form: UseFormReturn<VariantTypeFormInput>;
  onSubmit: (data: VariantTypeFormInput) => Promise<void>;
  selected?: VariantTypeFormInput;
  onDelete?: () => Promise<void>;
}) {
  const [batchValues, setBatchValues] = useState("");
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "values",
  });

  const watchValues = form.watch("values");
  const tableData = fields.map((field, index) => ({
    ...field,
    ...watchValues?.[index],
  }));

  const columns = React.useMemo<ColumnDef<VariantValueItem>[]>(
    () => [
      {
        accessorKey: "id",
        cell: ({ row }) => (
          <Button
            onClick={() => remove(row.index)}
            variant="ghost"
            className="text-rose-500 hover:text-rose-700 h-7 w-7 p-0"
            size="sm"
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "value",
        cell: ({ row }) => (
          <FormField
            form={form}
            name={`values.${row.index}.value`}
            render={({ field }) => (
              <Field>
                <Input
                  {...field}
                  placeholder="Option value, e.g. 10mm"
                  className="w-full h-8 text-sm"
                />

                <FieldError className="text-xs" />
              </Field>
            )}
          />
        ),
      },
    ],
    [form.control, remove],
  );

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <FormField
        form={form}
        name="name"
        label="Variant Type Name"
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Input placeholder="e.g. Size, Color, Grade" {...field} />
            {selected && onDelete && (
              <>
                <Button
                  variant="outline"
                  className="text-rose-600 hover:bg-rose-50"
                  type="button"
                  onClick={() => setIsConfirmDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <ConfirmDialog
                  isOpen={isConfirmDeleteOpen}
                  onClose={() => setIsConfirmDeleteOpen(false)}
                  title="Delete Variant Type"
                  description="Are you sure you want to delete this variant type?"
                  onConfirm={async () => {
                    setIsConfirmDeleteOpen(false);
                    await onDelete();
                  }}
                />
              </>
            )}
          </div>
        )}
      />

      <FormField
        form={form}
        name="isBreakpackFilter"
        render={({ field: { onChange, value } }) => (
          <Field orientation="horizontal">
            <Checkbox
              id="isBreakpackFilter"
              checked={value}
              onCheckedChange={onChange}
            />

            <FieldLabel htmlFor="isBreakpackFilter" className="font-normal">
              Use as Breakpack Filter
            </FieldLabel>
            <FieldError />
          </Field>
        )}
      />

      <Field className="space-y-2">
        <FieldLabel>Values</FieldLabel>

        <ScrollArea className="max-h-[220px]">
          <DataTable data={tableData} columns={columns} />
        </ScrollArea>

        <div className="flex gap-2 justify-between items-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => append({ value: "" })}
          >
            <Plus />
          </Button>
          <Input
            placeholder="Add values separated by comma (Press Enter)"
            value={batchValues}
            onChange={(e) => setBatchValues(e.target.value)}
            className="text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const vals = batchValues
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean);
                vals.forEach((val) => append({ value: val }));
                setBatchValues("");
              }
            }}
          />
        </div>
      </Field>

      <DialogFooter className="pt-2">
        <Button type="submit" className="bg-primary text-white">
          {selected?.id ? "Update Variant" : "Add Variant"}
        </Button>
      </DialogFooter>
    </form>
  );
}
