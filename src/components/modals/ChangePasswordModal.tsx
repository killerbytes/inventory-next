"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { ChangePasswordInput, ChangePasswordInputSchema } from "@/schemas";
import { changePasswordAction } from "@/server/actions/user.actions";
import { useUIStore } from "@/stores/uiStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Modal from "../common/Modal";
import FormField from "../forms/FormField";

function ChangePasswordModalContent() {
  const [isPending, startTransition] = useTransition();
  const { setChangePasswordModalOpen } = useUIStore();

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordInputSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ChangePasswordInput) => {
    // if (values.newPassword !== values.confirmPassword) {
    //   toast.error("New passwords do not match.");
    //   return;
    // }
    // if (values.newPassword.length < 6) {
    //   toast.error("Password must be at least 6 characters.");
    //   return;
    // }

    startTransition(async () => {
      try {
        await changePasswordAction({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
        });
        toast.success("Password changed successfully!");
        setChangePasswordModalOpen(false);
      } catch (error: any) {
        toast.error(error.message || "Failed to update password.");
      }
    });
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          name="oldPassword"
          form={form}
          label="Current Password"
          type="password"
        />
        <FormField
          name="newPassword"
          form={form}
          label="New Password"
          type="password"
        />
        <FormField
          name="confirmPassword"
          form={form}
          label="Confirm New Password"
          type="password"
        />
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setChangePasswordModalOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Update Password"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export default function ChangePasswordModal() {
  const { isChangePasswordModalOpen, setChangePasswordModalOpen } =
    useUIStore();

  if (!isChangePasswordModalOpen) return null;

  return (
    <Modal
      title="Change Account Password"
      description="Update your account password."
      isOpen={isChangePasswordModalOpen}
      onClose={() => setChangePasswordModalOpen(false)}
    >
      <ChangePasswordModalContent />
    </Modal>
  );
}
