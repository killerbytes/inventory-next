"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { SupplierInput, SupplierInputSchema } from "@/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createSupplierAction } from "@/server/actions/supplier.actions";
import { useUIStore } from "@/stores/uiStore";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Modal from "../common/Modal";
import FormField from "../forms/FormField";

function SupplierModalContent() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { setSupplierModalOpen, editingSupplier } = useUIStore();
  const isEditing = Boolean(editingSupplier?.id);
  const form = useForm<SupplierInput>({
    resolver: zodResolver(SupplierInputSchema),
    defaultValues: {
      name: editingSupplier?.name || "",
      address: editingSupplier?.address || "",
      phone: editingSupplier?.phone || "",
      email: editingSupplier?.email || "",
      contact: editingSupplier?.contact || "",
    },
  });

  const onSubmit = async (values: SupplierInput) => {
    try {
      await createSupplierAction(values);
      toast.success(`Supplier "${values.name}" created successfully!`);
      form.reset();
      setSupplierModalOpen(false, null);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create supplier");
    }
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
        <DialogFooter>
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
