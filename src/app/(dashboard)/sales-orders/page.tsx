import SalesOrdersClientWidget from "@/components/widgets/SalesOrdersClientWidget";
import { CustomerData, SalesOrderData } from "@/schemas";
import { customerServerService, salesServerService } from "@/server/services";
import { Meta, PAGINATION } from "@/types/definitions";
import { endOfMonth, format, startOfMonth } from "date-fns";

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

  let rows: SalesOrderData[] = [];
  let meta: Meta = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };

  try {
    const result = await salesServerService.getAll({
      startDate,
      endDate,
      status: params.status === "ALL" ? undefined : params.status,
      search: params.q,
      limit,
      offset,
    });

    rows = result.rows;
    meta = result.meta;
  } catch (err: any) {
    console.error(
      "Error fetching sales orders on server:",
      err?.message || err,
    );
  }

  let customers: CustomerData[] = [];
  try {
    customers = await customerServerService.getAll();
  } catch (error) {}
  return (
    <SalesOrdersClientWidget
      rows={JSON.parse(JSON.stringify(rows))}
      meta={meta}
      startDate={startDate}
      endDate={endDate}
      customers={JSON.parse(JSON.stringify(customers))}
    />
  );
}
