import React from "react";
import PageHeader from "@/components/layout/PageHeader";
import DashboardClientWidget from "@/components/widgets/DashboardClientWidget";
import { getDashboardDataAction } from "@/server/actions/dashboard.actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const initialData = await getDashboardDataAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
      />
      <DashboardClientWidget initialData={initialData} />
    </div>
  );
}
