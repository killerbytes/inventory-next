"use client";

import { DataTable } from "@/components/common/DataTable";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { UserData } from "@/schemas";
import { useUIStore } from "@/stores/uiStore";
import { UserRole } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { Edit, Plus, Shield, Users } from "lucide-react";
import { useMemo } from "react";
import { RoleGuard } from "../common/RoleGuard";
import UserModal from "../modals/UserModal";
import { Button } from "../ui/button";

interface UsersClientWidgetProps {
  initialUsers?: UserData[];
}

const columnHelper = createColumnHelper<UserData>();

export default function UsersClientWidget({
  initialUsers = [],
}: UsersClientWidgetProps) {
  const users = initialUsers || [];
  const { setUserModalOpen } = useUIStore();

  const columns = useMemo(
    () => [
      columnHelper.accessor("username", {
        header: "Username",
        cell: (info) => (
          <div className="flex items-center gap-2 font-semibold">
            <Users className="h-4 w-4 text-primary" />
            <span>{info.getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Full Name",
        cell: (info) => (
          <span>{info.getValue() || info.row.original.username}</span>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="font-mono text-xs text-muted-foreground">
            {info.getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => (
          <Badge
            variant="outline"
            className="gap-1 uppercase font-mono text-xs"
          >
            <Shield className="h-3 w-3 text-emerald-600" />
            {info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("isActive", {
        header: "Status",
        cell: (info) => (
          <Badge
            variant={info.getValue() !== false ? "default" : "destructive"}
          >
            {info.getValue() !== false ? "Active" : "Disabled"}
          </Badge>
        ),
      }),
      columnHelper.display({
        header: "Actions",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <RoleGuard allowedRoles={[UserRole.ADMIN]}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setUserModalOpen(true, info.row.original);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </RoleGuard>
          </div>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Accounts & Roles"
        description="System user management, permission roles, and account statuses."
      >
        <RoleGuard allowedRoles={[UserRole.ADMIN]}>
          <Button onClick={() => setUserModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        </RoleGuard>
      </PageHeader>

      <DataTable columns={columns} data={users} paginate={false} />

      <UserModal />
    </div>
  );
}
