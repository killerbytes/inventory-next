"use client";

import { UserData } from "@/schemas";
import { AuthProvider } from "@/stores/authStore";
import React from "react";
import { Toaster } from "sonner";
import { SidebarProvider } from "../ui/sidebar";

export function AppProvider({
  user,
  children,
}: {
  user: UserData;
  children: React.ReactNode;
}) {
  return (
    <AuthProvider user={user}>
      <SidebarProvider>
        {children}
        <Toaster position="bottom-left" richColors />
      </SidebarProvider>
    </AuthProvider>
  );
}
