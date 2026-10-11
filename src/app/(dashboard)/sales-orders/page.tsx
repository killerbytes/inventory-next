import SalesOrdersClientWidget from "@/components/widgets/SalesOrdersClientWidget";
import { CustomerData, SalesOrderData } from "@/schemas";
import { customerServerService, salesServerService } from "@/server/services";
import { PAGINATION } from "@/constants";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { Pagination, SalesOrderSummary } from "@/types";

export const dynamic = "force-dynamic";

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = (await searchParams) || {};
  const page = Number(params.page) || PAGINATION.PAGE;
  const limit = Number(params.limit) || PAGINATION.PAGE_SIZE;
  const offset = (page - 1) * limit;

  const defaultStartDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultEndDate = format(endOfMonth(new Date()), "yyyy-MM-dd");

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
      q: params.q,
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
      initialRows={JSON.parse(JSON.stringify(initialRows))}
      initialPagination={initialPagination}
      initialSummary={initialSummary}
      startDate={startDate}
      endDate={endDate}
      customers={JSON.parse(JSON.stringify(customers))}
    />
  );
}
