"use client";

import VariantTypesForm, {
  VariantTypeFormInput,
} from "@/components/forms/VariantTypesForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createVariantTypeAction,
  deleteVariantTypeAction,
  updateVariantTypeAction,
} from "@/server/actions/variantType.actions";
import { useUIStore } from "@/stores/uiStore";
import { cx } from "class-variance-authority";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Modal from "../common/Modal";

const defaultValues: VariantTypeFormInput = {
  name: "",
  isBreakpackFilter: false,
  values: [],
};

interface VariantsModalProps {
  productId: number;
  variants?: any[];
}

function VariantsModalContent({
  productId,
  variants = [],
}: VariantsModalProps) {
  const [selected, setSelected] = useState<VariantTypeFormInput | undefined>(
    undefined,
  );
  const [shouldOpenComboModal, setShouldOpenComboModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VariantTypeFormInput>({
    defaultValues: {
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (selected) {
      form.reset({
        id: selected.id,
        name: selected.name || "",
        isBreakpackFilter: !!selected.isBreakpackFilter,
        values: selected.values || [],
      });
    } else {
      form.reset(defaultValues);
    }
  }, [selected, form]);

  const handleSubmit = async (values: VariantTypeFormInput) => {
    console.log(5435345, values);

    try {
      setIsSubmitting(true);

      if (values.id) {
        await updateVariantTypeAction(Number(values.id), values);
        toast.success("Variant type updated successfully");
      } else {
        await createVariantTypeAction({ ...values, productId });
        toast.success("Variant type created successfully");
      }

      setSelected(undefined);
      form.reset(defaultValues);
      setShouldOpenComboModal(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to save variant type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected?.id) return;
    try {
      setIsSubmitting(true);
      await deleteVariantTypeAction(Number(selected.id));
      toast.success("Variant type deleted successfully");
      setSelected(undefined);
      form.reset(defaultValues);
      setShouldOpenComboModal(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete variant type");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap items-center">
          {variants.map((v: any, index: number) => {
            const isSelected = selected?.id === v.id;
            return (
              <Badge
                key={v.id || index}
                variant={isSelected ? "default" : "secondary"}
                className={cx("cursor-pointer select-none", {
                  "bg-primary text-primary-foreground": isSelected,
                })}
                onClick={() => setSelected(v)}
              >
                {v.name}
              </Badge>
            );
          })}
          <Button
            type="button"
            variant={!selected ? "default" : "outline"}
            size="icon"
            onClick={() => {
              setSelected(undefined);
              form.reset(defaultValues);
            }}
          >
            <Plus />
          </Button>
        </div>

        <VariantTypesForm
          key={selected?.id || "new"}
          form={form}
          selected={selected}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      </div>
    </>
  );
}

export default function VariantsModal({
  productId,
  variants,
}: {
  productId: number;
  variants?: any[];
}) {
  const { isVariantModalOpen, setVariantModalOpen } = useUIStore();

  if (!isVariantModalOpen) return null;

  return (
    <Modal
      title="Variants"
      description="Add variants to the product"
      isOpen={isVariantModalOpen}
      onClose={() => setVariantModalOpen(false)}
    >
      <VariantsModalContent productId={productId} variants={variants} />
    </Modal>
  );
}
