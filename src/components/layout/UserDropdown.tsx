"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth.actions";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { ChevronUp, Cog, KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import AdminPanelModal from "../modals/AdminPanelModal";
import ChangePasswordModal from "../modals/ChangePasswordModal";

export default function UserDropdown() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { setAdminPanelModalOpen, setChangePasswordModalOpen } = useUIStore();

  const handleLogout = async () => {
    try {
      const res = await logoutAction();
      if (!res.success) {
        toast.error(res.error || "Logout failed. Please try again.");
      }
    } catch (error: any) {
      toast.error(error?.message || "Logout failed. Please try again.");
    } finally {
      logout();
      router.push("/login");
      router.refresh();
    }
  };

  const displayName = user?.name || user?.username || "";
  const userRole = user?.role;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div className="flex gap-2 items-center cursor-pointer p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors w-full">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold truncate">
                {displayName}
              </div>
              <div className="text-xs text-sidebar-foreground/70 uppercase tracking-wide ">
                {userRole}
              </div>
            </div>
            <ChevronUp className="h-4 w-4 ml-auto text-sidebar-foreground/70 shrink-0" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="w-56 p-1">
          <DropdownMenuItem
            onClick={() => setAdminPanelModalOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <Cog /> Admin Panel
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setChangePasswordModalOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <KeyRound /> Change Password
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleLogout}
            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordModal />
      <AdminPanelModal />
    </>
  );
}
