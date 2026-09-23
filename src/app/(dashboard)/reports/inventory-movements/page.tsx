import InventoryMovementsClientWidget from "@/components/widgets/InventoryMovementsClientWidget";
import { inventoryServerService } from "@/server/services/inventoryServer.service";

export const dynamic = "force-dynamic";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = (await searchParams) || {};
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 25;
  const status = params.status === "ALL" ? undefined : params.status;
  const q = params.q || undefined;
  const startDate = params.startDate || undefined;
  const endDate = params.endDate || undefined;

  let rows: any[] = [];
  let meta = {
    total: 0,
    totalPages: 0,
    currentPage: page,
  };
  let summary = {
    totalValue: { label: "Total Amount", value: 0 },
    totalQuantity: { label: "Total Quantity", value: 0 },
  };

  try {
    const result = await inventoryServerService.getMovements({
      page,
      limit,
      type: status,
      q,
      startDate,
      endDate,
    });
    rows = result.data || [];
    meta = result.meta;
    summary = result.summary;
  } catch (err) {
    console.error("Error fetching inventory movements:", err);
  }

  return (
    <InventoryMovementsClientWidget
      initialMovements={rows}
      meta={meta}
      summary={summary}
    />
  );
}
