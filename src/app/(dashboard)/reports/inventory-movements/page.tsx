import InventoryMovementsClientWidget from "@/components/widgets/InventoryMovementsClientWidget";
import { reportsServerService } from "@/server/services/reportsServer.service";

export const dynamic = "force-dynamic";

export default async function MovementsPage() {
  let movements: any[] = [];
  try {
    const result = await reportsServerService.getInventoryMovements();
    movements = result || [];
  } catch (err) {
    console.error("Error fetching inventory movements:", err);
    movements = [];
  }

  return <InventoryMovementsClientWidget initialMovements={movements} />;
}
