import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import SalesOrdersClientWidget from "@/components/widgets/SalesOrdersClientWidget";
import { CustomerData, SalesOrderData } from "@/schemas";
import { customerServerService, salesServerService } from "@/server/services";
import { PAGINATION } from "@/constants";
import { getBusinessCalendar } from "@/server/services/dateFilter";
import { Pagination, SalesOrderSummary } from "@/types";

export const dynamic = "force-dynamic";

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  await requirePermission(PERMISSIONS.VIEW_SALES);
  const params = (await searchParams) || {};
  const page = Number(params.page) || PAGINATION.PAGE;
  const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
  const offset = (page - 1) * limit;

  // Business-timezone month; the server clock can still be on last month's date.
  const { monthStart: defaultStartDate, monthEnd: defaultEndDate } =
    getBusinessCalendar();

  const startDate = params.startDate || defaultStartDate;
  const endDate = params.endDate || defaultEndDate;

  let initialRows: SalesOrderData[] = [];
  let initialPagination: Pagination = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };
  let initialSummary: SalesOrderSummary = {
    totalAmount: 0,
    totalProfitAmount: 0,
    totalReturnAmount: 0,
    totalExchangeAmount: 0,
  };

  try {
    const result = await salesServerService.getAll({
      startDate,
      endDate,
      status: params.status === "ALL" ? undefined : params.status,
      search: params.q,
      limit,
      page,
      sort: params.sort,
      order: params.order as "ASC" | "DESC" | undefined,
    });

    initialRows = result.rows;
    initialPagination = result.pagination;
    initialSummary = result.summary
  } catch (err: any) {
    console.error(
      "Error fetching sales orders on server:",
      err?.message || err,
    );
  }
  let customers: CustomerData[] = [];
  try {
    customers = await customerServerService.getAll();
  } catch (error) { }
  return (
    <SalesOrdersClientWidget
      initialRows={initialRows}
      initialPagination={initialPagination}
      initialSummary={initialSummary}
      startDate={startDate}
      endDate={endDate}
      customers={customers}
    />
  );
}
