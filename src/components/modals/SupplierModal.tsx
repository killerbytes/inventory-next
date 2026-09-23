"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { SupplierInput, SupplierInputSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createSupplierAction,
  deleteSupplierAction,
  updateSupplierAction,
} from "@/server/actions/supplier.actions";
import { useUIStore } from "@/stores/uiStore";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import ConfirmDialog from "../common/ConfirmDialog";
import Modal from "../common/Modal";
import FormField from "../forms/FormField";

function SupplierModalContent() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { setSupplierModalOpen, editingSupplier } = useUIStore();
  const isEditing = Boolean(editingSupplier?.id);
  const form = useForm<SupplierInput>({
    resolver: zodResolver(SupplierInputSchema),
    values: useMemo(() => {
      return {
        name: editingSupplier?.name || "",
        address: editingSupplier?.address || "",
        phone: editingSupplier?.phone || "",
        email: editingSupplier?.email || "",
        contact: editingSupplier?.contact || "",
      };
    }, [editingSupplier]),
  });

  const onSubmit = async (values: SupplierInput) => {
    startTransition(async () => {
      try {
        if (isEditing && editingSupplier?.id) {
          await updateSupplierAction(editingSupplier.id, values);
        } else {
          await createSupplierAction(values);
        }
        toast.success(
          `Supplier "${values.name}" ${isEditing ? "updated" : "created"} successfully!`,
        );
        form.reset();
        setSupplierModalOpen(false, null);
        router.refresh();
      } catch (err: any) {
        toast.error(
          err?.message ||
            `Failed to ${isEditing ? "update" : "create"} supplier`,
        );
      }
    });
  };
  const onDelete = () => {
    startTransition(async () => {
      try {
        await deleteSupplierAction(editingSupplier?.id!);
        toast.success("Supplier deleted successfully!");
        form.reset();
        setSupplierModalOpen(false, null);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete supplier");
      }
    });
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          form={form}
          name="name"
          label="Supplier Name"
          placeholder="Holcim Philippines"
        />
        <FormField
          form={form}
          name="phone"
          label="Phone Number"
          placeholder="09171234567"
        />
        <FormField
          form={form}
          name="email"
          label="Email Address"
          placeholder="supplier@company.com"
        />
        <FormField
          form={form}
          name="address"
          label="Address"
          placeholder="Manila, Philippines"
        />
        <FormField
          form={form}
          name="contact"
          label="Contact Person"
          placeholder="John Doe"
        />
        <DialogFooter className="justify-between!">
          <ConfirmDialog
            title={`Delete ${editingSupplier?.name}`}
            description={`Are you sure you want to delete ${editingSupplier?.name}?`}
            onConfirm={onDelete}
          >
            <Button type="button" variant="destructive" size="icon">
              <Trash2 />
            </Button>
          </ConfirmDialog>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSupplierModalOpen(false, null)}
            >
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isEditing ? "Update Supplier" : "Save Supplier"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}

export default function SupplierModal() {
  const { isSupplierModalOpen, setSupplierModalOpen, editingSupplier } =
    useUIStore();
  const isEditing = Boolean(editingSupplier?.id);
  if (!isSupplierModalOpen) return null;

  return (
    <Modal
      title={isEditing ? "Edit Supplier" : "Add New Supplier"}
      description={isEditing ? "Edit Supplier" : "Add New Supplier"}
      isOpen={isSupplierModalOpen}
      onClose={() => setSupplierModalOpen(false)}
    >
      <SupplierModalContent />
    </Modal>
  );
}
