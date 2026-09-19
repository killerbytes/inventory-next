"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { ChevronUp, KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

export default function UserDropdown() {
  const { user, logout } = useAuthStore();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    toast.success("Password updated successfully!");
    setIsPasswordModalOpen(false);
    setPassword("");
    setConfirmPassword("");
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error("Logout failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      logout();
      router.push("/login");
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
              <div className="text-xs text-sidebar-foreground/70 uppercase tracking-wide font-mono">
                {userRole}
              </div>
            </div>
            <ChevronUp className="h-4 w-4 ml-auto text-sidebar-foreground/70 shrink-0" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="w-56 p-1">
          <DropdownMenuItem
            onClick={() => setIsPasswordModalOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <KeyRound className="h-4 w-4" /> Change Password
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleLogout}
            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Confirm New Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
