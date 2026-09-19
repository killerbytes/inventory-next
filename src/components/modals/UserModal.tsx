"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import {
  UserData,
  UserInput,
  UserInputSchema,
  UserUpdateInput,
  UserUpdateSchema,
} from "@/schemas";
import {
  createUserAction,
  updateUserAction,
} from "@/server/actions/user.actions";
import { useUIStore } from "@/stores/uiStore";
import { USER_ROLE_OPTIONS } from "@/types/definitions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Modal from "../common/Modal";
import FormField from "../forms/FormField";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";

function UserModalContent() {
  const { setUserModalOpen, editingUser } = useUIStore();
  const router = useRouter();
  const isEditing = Boolean(editingUser?.id);

  const onSubmit = async () => {
    setUserModalOpen(false);
    router.refresh();
  };

  return isEditing && editingUser ? (
    <EditUserForm
      onSuccess={onSubmit}
      onCancel={() => {
        setUserModalOpen(false);
      }}
      user={editingUser}
    />
  ) : (
    <CreateUserForm
      onSuccess={onSubmit}
      onCancel={() => {
        setUserModalOpen(false);
      }}
    />
  );
}

export default function UserModal() {
  const { isUserModalOpen, setUserModalOpen } = useUIStore();

  if (!isUserModalOpen) return null;

  return (
    <Modal
      title="User Accounts & Roles"
      description="System user management, permission roles, and account statuses."
      isOpen={isUserModalOpen}
      onClose={() => setUserModalOpen(false)}
    >
      <UserModalContent />
    </Modal>
  );
}

function CreateUserForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<UserInput>({
    resolver: zodResolver(UserInputSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: UserInput) => {
    startTransition(async () => {
      try {
        await createUserAction(values);
        toast.success(`User "${values.name}" created successfully!`);
        onSuccess();
      } catch (err: any) {
        const errorMessage =
          err?.message ||
          (typeof err === "string" ? err : "Failed to create user");
        toast.error(errorMessage);
      }
    });
  };

  return (
    <UserForm
      form={form}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isPending={isPending}
      isEditing={false}
    />
  );
}

function EditUserForm({
  onSuccess,
  onCancel,
  user,
}: {
  onSuccess: () => void;
  onCancel: () => void;
  user: UserData;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<UserUpdateInput>({
    resolver: zodResolver(UserUpdateSchema),
    values: {
      name: user?.name,
      username: user?.username,
      email: user?.email,
      role: user?.role,
      isActive: user?.isActive,
    },
  });

  const onSubmit = async (values: UserUpdateInput) => {
    startTransition(async () => {
      try {
        await updateUserAction(user.id, values);
        toast.success(`User "${values.name}" updated successfully!`);
        onSuccess();
      } catch (err: any) {
        const errorMessage =
          err?.message ||
          (typeof err === "string" ? err : "Failed to update user");
        toast.error(errorMessage);
      }
    });
  };

  return (
    <UserForm
      form={form}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isPending={isPending}
      isEditing
    />
  );
}

function UserForm<T extends UserUpdateInput | UserInput>({
  form,
  onSubmit,
  onCancel,
  isPending,
  isEditing,
}: {
  form: UseFormReturn<T>;
  onSubmit: (data: T) => void;
  onCancel: () => void;
  isPending: boolean;
  isEditing: boolean;
}) {
  return (
    <>
      <div className="-mx-4 no-scrollbar max-h-[90vh] overflow-y-auto px-4">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            name="name"
            label="Name"
            placeholder="John Doe"
            form={form}
          />
          <FormField
            name="username"
            label="Username"
            placeholder="johndoe"
            form={form}
          />
          <FormField
            name="email"
            label="Email"
            placeholder="email@email.com"
            form={form}
          />
          {isEditing ? (
            <>
              <FormField
                form={form}
                name="role"
                label="Role"
                render={({ field }) => (
                  <Select
                    {...field}
                    onValueChange={field.onChange}
                    items={USER_ROLE_OPTIONS}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormField
                form={form}
                name="isActive"
                label="Active"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </>
          ) : (
            <>
              <FormField
                name="password"
                label="Password"
                placeholder="********"
                form={form}
                render={({ field }) => <Input type="password" {...field} />}
              />

              <FormField
                name="confirmPassword"
                label="Confirm Password"
                placeholder="********"
                form={form}
                render={({ field }) => <Input type="password" {...field} />}
              />
            </>
          )}
        </form>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={isPending}
          type="submit"
          onClick={form.handleSubmit(onSubmit)}
        >
          {isEditing ? "Save Changes" : "Create User"}
        </Button>
      </DialogFooter>
    </>
  );
}
