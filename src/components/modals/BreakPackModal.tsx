"use client";

import {
  BreakPackInput,
  BreakPackInputSchema,
  ProductCombinationData,
  ProductData,
} from "@/schemas";
import { breakPackAction } from "@/server/actions/inventory.actions";
import { useUIStore } from "@/stores/uiStore";
import { UNIT_COLOR } from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircleIcon,
  Equal,
  Loader2Icon,
  MoveRight,
  PackageOpen,
  PackagePlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo, useState, useTransition } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import ColorBadge from "../common/ColorBadge";
import Modal from "../common/Modal";
import FormField from "../forms/FormField";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { DialogFooter } from "../ui/dialog";
import { FieldLabel } from "../ui/field";
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

function BreakPackModalContent({ product }: { product: ProductData }) {
  const router = useRouter();
  const [options, setOptions] = useState<ProductCombinationData[]>([]);
  const { editingCombination, setBreakPackModalOpen } = useUIStore();

  const combination = editingCombination;
  if (!combination) return null;

  const form = useForm<BreakPackInput>({
    resolver: zodResolver(BreakPackInputSchema),
    defaultValues: {
      fromCombinationId: combination?.id,
      toCombinationId: -1,
      quantity: 1,
    },
  });

  const toCombinationId = useWatch({
    control: form.control,
    name: "toCombinationId",
  });
  const selected = useMemo(() => {
    return options.find((i) => i.id === Number(toCombinationId));
  }, [toCombinationId]);

  const [isPending, startTransition] = useTransition();
  const quantity = useController({ control: form.control, name: "quantity" });
  const packType = getPackRelationType(combination, selected);

  let totalQuantity;
  if (packType === "BREAK_PACK") {
    totalQuantity =
      Number(quantity.field.value) * Number(combination.conversionFactor);
  } else if (packType === "RE_PACK") {
    totalQuantity =
      Number(quantity.field.value) / Number(selected?.conversionFactor);
  }

  React.useEffect(() => {
    if (combination?.inventory?.quantity && packType === "RE_PACK") {
      form.reset({
        ...form.getValues(),
        quantity: Number(selected?.conversionFactor),
      });
    }
  }, [combination, form, packType, selected?.conversionFactor]);

  const filterOptionsByVariant = (
    options: ProductCombinationData[],
    variant: string,
  ) => {
    return options.filter((o) => o.values?.some((v) => v.value === variant));
  };

  React.useEffect(() => {
    const { combinations, variants } = product || {};

    if (!combinations || !variants) return;
    const options = combinations.filter(
      (c) =>
        c.id != combination.id &&
        (c.isBreakPackOfId === combination.id ||
          combination.isBreakPackOfId === c.id),
    );

    const result = variants.find((item: any) => /^\[.*\]$/.test(item.name));

    if (result?.id) {
      const variant = combination.values?.find(
        (i) => i.variantTypeId === result.id,
      )?.value;
      if (variant) {
        setOptions(filterOptionsByVariant(options, variant));
      } else {
        setOptions(options);
      }
    } else {
      setOptions(options);
    }
  }, [product]);

  React.useEffect(() => {
    if (options.length === 1) {
      form.setValue("toCombinationId", options[0].id);
    }
  }, [options]);

  const onSubmit = async (values: BreakPackInput) => {
    if (!selected || Number(values.toCombinationId) <= 0) {
      toast.error("Please select a target combination.");
      return;
    }

    startTransition(async () => {
      try {
        await breakPackAction({
          fromCombinationId: Number(values.fromCombinationId),
          toCombinationId: Number(values.toCombinationId),
          quantity: Number(values.quantity),
        });
        toast.success(
          packType === "BREAK_PACK"
            ? "Break pack completed successfully!"
            : "Re-pack completed successfully!",
        );
        router.refresh();
        setBreakPackModalOpen(false);
      } catch (error: any) {
        toast.error(
          error?.message || "Failed to execute break pack operation.",
        );
      }
    });
  };

  return (
    <>
      <div className="flex flex-col gap-2  ">
        <div className="flex gap-2">
          {combination?.unit && (
            <ColorBadge colorMap={UNIT_COLOR}>{combination.unit}</ColorBadge>
          )}
          {combination?.name}
          <span className="ml-auto">
            Stock: {Number(combination?.inventory?.quantity)}
          </span>
        </div>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {options.length ? (
          <FormField
            form={form}
            name="toCombinationId"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Select Combination"
                    render={(value) => {
                      const selected = options.find(
                        (c: any) => c.id === Number(value.children),
                      );
                      return (
                        <>
                          <ColorBadge colorMap={UNIT_COLOR}>
                            {selected?.unit}
                          </ColorBadge>
                          {selected?.name}
                          <span className="ml-auto">
                            {getPackRelationType(
                              combination,
                              options.find(
                                (c: any) => c.id === Number(value.children),
                              ),
                            ) === "BREAK_PACK" && (
                              <div className="flex items-center gap-1">
                                <PackageOpen color="red" /> (Break Pack)
                              </div>
                            )}
                            {getPackRelationType(
                              combination,
                              options.find(
                                (c: any) => c.id === Number(value.children),
                              ),
                            ) === "RE_PACK" && (
                              <div className="flex items-center gap-1">
                                <PackagePlus color="green" /> (Re Pack)
                              </div>
                            )}
                          </span>
                        </>
                      );
                    }}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>To Combination</SelectLabel>

                    {options.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1">
                            <ColorBadge colorMap={UNIT_COLOR}>
                              {String(option.unit)}
                            </ColorBadge>
                            {option.name}
                          </div>

                          <span>
                            {getPackRelationType(combination, option) ===
                              "BREAK_PACK" && <PackageOpen color="red" />}
                            {getPackRelationType(combination, option) ===
                              "RE_PACK" && <PackagePlus color="green" />}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
        ) : (
          <Alert variant="destructive">
            <AlertCircleIcon />

            <AlertTitle>
              No other units found with the same variation.
            </AlertTitle>
            <AlertDescription>
              Please add a new combination to the product
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 justify-between items-center">
          {selected && (
            <>
              <FieldLabel>Quantity</FieldLabel>
              <FormField
                form={form}
                name="quantity"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    value={Number.parseFloat(String(field.value))}
                  />
                )}
              />
              <div className="flex flex-col gap-2 ">
                <div className="flex gap-2 items-center font-bold">
                  {quantity.field.value}
                  <ColorBadge colorMap={UNIT_COLOR}>
                    {String(combination.unit)}
                  </ColorBadge>
                  <MoveRight size={18} />

                  {totalQuantity}
                  <ColorBadge colorMap={UNIT_COLOR}>
                    {String(selected.unit)}
                  </ColorBadge>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between!">
          {selected && (
            <>
              <div className="flex gap-1 items-center border rounded-md bg-secondary px-2 py-1 text-sm">
                {packType === "BREAK_PACK" && 1}
                {packType === "RE_PACK" && Number(selected?.conversionFactor)}
                <ColorBadge colorMap={UNIT_COLOR}>
                  {combination.unit}
                </ColorBadge>
                <Equal />
                {packType === "BREAK_PACK" &&
                  Number(combination.conversionFactor)}
                {packType === "RE_PACK" && 1}
                <ColorBadge colorMap={UNIT_COLOR}>
                  {String(selected?.unit)}
                </ColorBadge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setBreakPackModalOpen(false)}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={!selected || isPending}>
                  {isPending && <Loader2Icon className="animate-spin" />}
                  {packType === "BREAK_PACK" ? (
                    <>
                      <PackageOpen className="text-red-400" /> Break Pack
                    </>
                  ) : (
                    packType === "RE_PACK" && (
                      <>
                        <PackagePlus className="text-green-500" />
                        Re-Pack
                      </>
                    )
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </form>
    </>
  );
}

/**
 * Modal dialog component for breaking parent unit packages into child units or re-packing.
 */
export default function BreakPackModal({ product }: { product: ProductData }) {
  const { isBreakPackModalOpen, setBreakPackModalOpen } = useUIStore();

  if (!isBreakPackModalOpen) return null;

  return (
    <Modal
      title="Break Pack"
      description="Break Pack and Re-Pack to another unit"
      isOpen={isBreakPackModalOpen}
      onClose={() => setBreakPackModalOpen(false)}
      size="md"
    >
      <BreakPackModalContent product={product} />
    </Modal>
  );
}

function getPackRelationType(
  fromCombo: ProductCombinationData,
  toCombo?: ProductCombinationData,
) {
  if (toCombo?.isBreakPackOfId === fromCombo.id) return "BREAK_PACK";
  if (fromCombo.isBreakPackOfId === toCombo?.id) return "RE_PACK";
  return null;
}
