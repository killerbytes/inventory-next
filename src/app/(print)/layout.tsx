import { requireSession } from "@/server/auth/guards";
import React from "react";

export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 print:bg-white print:text-black print:min-h-0 print:w-full">
      {children}
    </div>
  );
}

