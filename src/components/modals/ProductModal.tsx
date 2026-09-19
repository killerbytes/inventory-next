"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { UNIT_COLOR, UNIT_OPTIONS } from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ColorBadge from "../common/ColorBadge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

import { getCategoriesAction } from "@/server/actions/category.actions";
import { useEffect, useState, useTransition } from "react";

import {
  ProductInputSchema,
  ProductUpdateInput,
  ProductUpdateSchema,
} from "@/schemas";
import {
  createProductAction,
  updateProductAction,
} from "@/server/actions/product.actions";
import { useUIStore } from "@/stores/uiStore";
import { useRouter } from "next/navigation";
import Modal from "../common/Modal";
import FormField from "../forms/FormField";
import { Textarea } from "../ui/textarea";

function ProductModalContent() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const { isProductModalOpen, setProductModalOpen, editingProduct } =
    useUIStore();
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(editingProduct?.id);
  useEffect(() => {
    if (isProductModalOpen) {
      getCategoriesAction().then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      });
    }
  }, [isProductModalOpen]);

  const form = useForm<ProductUpdateInput>({
    resolver: zodResolver(isEditing ? ProductUpdateSchema : ProductInputSchema),
    values: {
      name: editingProduct ? editingProduct.name : "",
      description: editingProduct ? editingProduct.description : "",
      baseUnit: editingProduct ? editingProduct.baseUnit : "PCS",
      categoryId: editingProduct ? editingProduct.categoryId : 0,
    },
  });

  const onSubmit = async (values: ProductUpdateInput) => {
    startTransition(async () => {
      try {
        if (isEditing && editingProduct?.id) {
          await updateProductAction(editingProduct.id, values);
          toast.success(`Product "${values.name}" updated successfully!`);
          router.refresh();
        } else {
          const result = await createProductAction(values);
          router.push(`/products/${result.id}`);
          toast.success(`Product "${values.name}" created successfully!`);
        }

        form.reset();
        setProductModalOpen(false, null);
      } catch (err: any) {
        toast.error(err?.message || "Failed to create product");
      }
    });
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          form={form}
          name="name"
          label="Product Name"
          placeholder="e.g. Portland Cement 40kg"
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            form={form}
            name="baseUnit"
            label="Base Unit"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(val) => field.onChange(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit">
                    {(value) => (
                      <ColorBadge colorMap={UNIT_COLOR}>
                        {String(value)}
                      </ColorBadge>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Base Unit</SelectLabel>
                    {UNIT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <ColorBadge colorMap={UNIT_COLOR}>
                          {String(option.label)}
                        </ColorBadge>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />

          <FormField
            form={form}
            name="categoryId"
            label="Category"
            render={({ field }) => (
              <Select
                value={
                  field.value && field.value > 0 ? String(field.value) : null
                }
                onValueChange={(val) =>
                  field.onChange(val ? Number(val) : undefined)
                }
                items={categories.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger>
                  <SelectGroup>
                    <SelectLabel>Categories</SelectLabel>
                    {categories.map((option: any) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {String(option.name)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <FormField
          form={form}
          name="description"
          label="Description"
          render={({ field }) => (
            <Textarea placeholder="Detailed specs..." {...field} />
          )}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setProductModalOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
                ? "Update Product"
                : "Create Product"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export default function ProductModal() {
  const { isProductModalOpen, setProductModalOpen } = useUIStore();

  if (!isProductModalOpen) return null;

  return (
    <Modal
      title="Product Management"
      description="Add and manage product master data."
      isOpen={isProductModalOpen}
      onClose={() => setProductModalOpen(false)}
    >
      <ProductModalContent />
    </Modal>
  );
}
