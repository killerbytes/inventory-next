import GoodReceiptsClientWidget from "@/components/widgets/GoodReceiptsClientWidget";
import { GoodReceiptData, SupplierData } from "@/schemas";
import {
  goodReceiptServerService,
  supplierServerService,
} from "@/server/services";
import {
  GoodReceiptSummary,
  Pagination,
  PAGINATION,
} from "@/types/definitions";
import { endOfMonth, format, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function GoodReceiptsPage({
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

  let initialRows: GoodReceiptData[] = [];
  let suppliers: SupplierData[] = [];
  let pagination: Pagination = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };
  let summary: GoodReceiptSummary = {
    totalAmount: 0,
    totalPayableAmount: 0,
    totalReturnAmount: 0,
  };

  try {
    const result = await goodReceiptServerService.getAll({
      startDate,
      endDate,
      status: params.status === "ALL" ? undefined : params.status,
      search: params.q,
      limit,
      offset,
    });

    initialRows = result.data;
    pagination = result.pagination;
    if (result.summary) {
      summary = result.summary;
    }

    const supplierRecords = await supplierServerService.getAll();
    suppliers = supplierRecords
      ? JSON.parse(JSON.stringify(supplierRecords))
      : [];
  } catch (err) {
    console.error("Failed to fetch good receipts on server:", err);
  }

  return (
    <GoodReceiptsClientWidget
      initialRows={initialRows}
      initialPagination={pagination}
      initialSummary={summary}
      startDate={startDate}
      endDate={endDate}
      suppliers={suppliers}
    />
  );
}
