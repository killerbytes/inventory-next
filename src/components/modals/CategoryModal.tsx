"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  CategoryInput,
  CategoryInputSchema,
  CategoryUpdateInput,
  CategoryUpdateSchema,
} from "@/schemas";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/server/actions/category.actions";
import { useUIStore } from "@/stores/uiStore";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Modal from "../common/Modal";
import FormField from "../forms/FormField";

function CategoryModalContent() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { setCategoryModalOpen, editingCategory } = useUIStore();
  const isEditing = Boolean(editingCategory?.id);

  const form = useForm<CategoryUpdateInput>({
    resolver: zodResolver(
      isEditing ? CategoryUpdateSchema : CategoryInputSchema,
    ),
    values: {
      name: editingCategory?.name || "",
      description: editingCategory?.description || "",
    },
  });

  const onSubmit = async (values: CategoryUpdateInput) => {
    startTransition(async () => {
      try {
        if (isEditing && editingCategory?.id) {
          await updateCategoryAction(editingCategory.id, values);
          toast.success(`Category "${values.name}" updated successfully!`);
        } else {
          await createCategoryAction(values as CategoryInput);
          toast.success(`Category "${values.name}" saved successfully!`);
        }
        form.reset();
        setCategoryModalOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Failed to save category");
      }
    });
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          form={form}
          name="name"
          label="Category Name"
          placeholder="e.g. Electrical & Wiring"
        />
        <FormField
          form={form}
          name="description"
          label="Description"
          placeholder="Category notes..."
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCategoryModalOpen(false)}
          >
            Cancel
          </Button>
          <Button disabled={isPending} type="submit">
            Save Category
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export default function CategoryModal() {
  const { isCategoryModalOpen, setCategoryModalOpen, editingCategory } =
    useUIStore();

  if (!isCategoryModalOpen) return null;

  return (
    <Modal
      title={editingCategory?.id ? "Edit Category" : "Add Category"}
      description=""
      isOpen={isCategoryModalOpen}
      onClose={() => setCategoryModalOpen(false)}
    >
      <CategoryModalContent />
    </Modal>
  );
}
