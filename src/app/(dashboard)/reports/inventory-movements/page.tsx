import InventoryMovementsClientWidget from "@/components/widgets/InventoryMovementsClientWidget";
import {
  inventoryServerService,
  InventoryMovementsSummary,
} from "@/server/services/inventoryServer.service";
import { PAGINATION } from "@/constants";
import { endOfMonth, format, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = (await searchParams) || {};
  const page = Number(params.page) || PAGINATION.PAGE;
  const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
  const status = params.status === "ALL" ? undefined : params.status;
  const ids = params.ids || [];

  const defaultStartDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultEndDate = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const startDate = params.startDate || defaultStartDate;
  const endDate = params.endDate || defaultEndDate;

  let rows: any[] = [];
  let meta = {
    total: 0,
    totalPages: 0,
    currentPage: page,
  };
  let summary: InventoryMovementsSummary | undefined;

  try {
    const result = await inventoryServerService.getMovements({
      page,
      limit,
      type: status,
      ids: ids.length > 0 ? [Number(ids)] : [],
      startDate,
      endDate,
      includeSummary: true,
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
      startDate={startDate}
      endDate={endDate}
    />
  );
}
