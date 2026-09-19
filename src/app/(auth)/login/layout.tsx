import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="flex-grow mx-auto flex flex-col min-h-screen bg-main size-full relative overflow-y-auto">
        {children}
      </main>
    </>
  );
}
