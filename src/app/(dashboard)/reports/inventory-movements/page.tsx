import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import InventoryMovementsClientWidget from "@/components/widgets/InventoryMovementsClientWidget";
import {
  inventoryServerService,
  InventoryMovementsSummary,
} from "@/server/services/inventoryServer.service";
import { PAGINATION } from "@/constants";
import { getBusinessCalendar } from "@/server/services/dateFilter";

export const dynamic = "force-dynamic";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  const params = (await searchParams) || {};
  const page = Number(params.page) || PAGINATION.PAGE;
  const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
  const status = params.status === "ALL" ? undefined : params.status;
  const isAllTime = params.allTime === "true" || params.startDate === "ALL";
  const idsParam = params.ids;
  const ids = idsParam
    ? String(idsParam)
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id) && id > 0)
    : [];

  // Business-timezone month; the server clock can still be on last month's date.
  const { monthStart: defaultStartDate, monthEnd: defaultEndDate } =
    getBusinessCalendar();

  const startDate = isAllTime ? undefined : (params.startDate || defaultStartDate);
  const endDate = isAllTime ? undefined : (params.endDate || defaultEndDate);

  let rows: any[] = [];
  let meta = {
    total: 0,
    totalPages: 0,
    currentPage: page,
  };
  let summary: InventoryMovementsSummary | undefined;

  const result = await inventoryServerService.getMovements({
    page,
    limit,
    type: status,
    ids: ids.length > 0 ? ids : undefined,
    startDate,
    endDate,
    includeSummary: true,
  });
  rows = result.data || [];
  meta = result.meta;
  summary = result.summary;

  return (
    <InventoryMovementsClientWidget
      initialMovements={rows}
      meta={meta}
      summary={summary}
      startDate={startDate}
      endDate={endDate}
      allTime={isAllTime}
    />
  );
}
