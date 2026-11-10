import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import StockAdjustmentsClientWidget from "@/components/widgets/StockAdjustmentsClientWidget";
import { StockAdjustmentData } from "@/schemas";
import { reportsServerService } from "@/server/services/reportsServer.service";

export const dynamic = "force-dynamic";

export default async function StockAdjustmentsPage() {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  let adjustments: StockAdjustmentData[] = [];
  const result = await reportsServerService.getStockAdjustments();
  adjustments = result || [];

  return (
    <StockAdjustmentsClientWidget
      initialAdjustments={JSON.parse(JSON.stringify(adjustments))}
    />
  );
}
