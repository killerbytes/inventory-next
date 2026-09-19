import StockAdjustmentsClientWidget from "@/components/widgets/StockAdjustmentsClientWidget";
import { StockAdjustmentData } from "@/schemas";
import { reportsServerService } from "@/server/services/reportsServer.service";

export const dynamic = "force-dynamic";

export default async function StockAdjustmentsPage() {
  let adjustments: StockAdjustmentData[] = [];
  try {
    const result = await reportsServerService.getStockAdjustments();
    adjustments = result || [];
  } catch (err) {
    console.error("Error fetching stock adjustments:", err);
    adjustments = [];
  }

  return (
    <StockAdjustmentsClientWidget
      initialAdjustments={JSON.parse(JSON.stringify(adjustments))}
    />
  );
}
