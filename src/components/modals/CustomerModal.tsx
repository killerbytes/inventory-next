"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CustomerInput, CustomerInputSchema } from "@/schemas";
import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from "@/server/actions/customer.actions";
import { useUIStore } from "@/stores/uiStore";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useTransition } from "react";
import ConfirmDialog from "../common/ConfirmDialog";
import Modal from "../common/Modal";
import FormField from "../forms/FormField";

function CustomerModalContent() {
  const router = useRouter();
  const { setCustomerModalOpen, editingCustomer } = useUIStore();
  const [isPending, startTransition] = useTransition();
  const isEditing = Boolean(editingCustomer?.id);

  const form = useForm<CustomerInput>({
    resolver: zodResolver(CustomerInputSchema),
    values: React.useMemo(() => {
      return {
        name: editingCustomer?.name || "",
        address: editingCustomer?.address || "",
        phone: editingCustomer?.phone || "",
        email: editingCustomer?.email || "",
        contact: editingCustomer?.contact || "",
      };
    }, [editingCustomer]),
  });

  const onSubmit = async (values: CustomerInput) => {
    startTransition(async () => {
      try {
        if (isEditing && editingCustomer?.id) {
          await updateCustomerAction(editingCustomer.id, values);
        } else {
          await createCustomerAction(values);
        }
        toast.success(
          `Customer "${values.name}" ${isEditing ? "updated" : "registered"} successfully!`,
        );
        form.reset();
        setCustomerModalOpen(false, null);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Failed to register customer");
      }
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      try {
        await deleteCustomerAction(editingCustomer?.id!);
        toast.success("Customer deleted successfully!");
        form.reset();
        setCustomerModalOpen(false, null);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete customer");
      }
    });
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField form={form} name="name" label="Customer / Company Name" />
        <FormField form={form} name="phone" label="Contact Number" />
        <FormField form={form} name="email" label="Email Address" />
        <FormField
          form={form}
          name="address"
          label="Delivery / Billing Address"
        />
        <FormField form={form} name="contact" label="Contact Name" />
        <DialogFooter className="justify-between!">
          <ConfirmDialog
            title={`Delete ${editingCustomer?.name}`}
            description={`Are you sure you want to delete ${editingCustomer?.name}?`}
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
              onClick={() => setCustomerModalOpen(false, null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Save Customer
            </Button>
          </div>
        </DialogFooter>
      </form>
    </>
  );
}

export default function CustomerModal() {
  const { isCustomerModalOpen, setCustomerModalOpen } = useUIStore();

  if (!isCustomerModalOpen) return null;

  return (
    <Modal
      title="Customer Accounts & Roles"
      description="Customer profile management, transaction histories, and account statuses."
      isOpen={isCustomerModalOpen}
      onClose={() => setCustomerModalOpen(false)}
    >
      <CustomerModalContent />
    </Modal>
  );
}
