import PageHeader from "@/components/layout/PageHeader";
import DashboardClientWidget from "@/components/widgets/DashboardClientWidget";
import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import { dashboardServerService } from "@/server/services";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | Inventory System",
  description: "Sales, stock, and purchasing overview.",
};

export default async function DashboardPage() {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  // Serialize so Dates/Decimals cross the server→client boundary as plain JSON.
  const summary = JSON.parse(JSON.stringify(await dashboardServerService.getSummary()));

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <DashboardClientWidget initialData={summary} />
    </div>
  );
}
