import AppSidebar from "@/components/layout/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { requireSession } from "@/server/auth/guards";
import React from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();

  return (
    <>
      <AppSidebar />
      <SidebarInset className="bg-sidebar">
        <main className="flex-grow mx-auto flex flex-col min-h-screen bg-main md:m-2 md:rounded-2xl size-full relative overflow-y-auto shadow-sm">
          <div className="flex flex-col gap-2 md:gap-4 p-2 md:p-4 flex-1">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
