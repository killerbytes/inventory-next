import GoodReceiptsClientWidget from "@/components/widgets/GoodReceiptsClientWidget";
import { GoodReceiptData, SupplierData } from "@/schemas";
import { goodReceiptServerService, supplierServerService } from "@/server/services";
import { Meta, PaginatedResponse, PAGINATION } from "@/types/definitions";
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

  let rows: GoodReceiptData[] = [];
  let suppliers: SupplierData[] = [];
  let meta: Meta = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };
  try {
    const result: PaginatedResponse<GoodReceiptData> =
      await goodReceiptServerService.getAll({
        startDate,
        endDate,
        status: params.status === "ALL" ? undefined : params.status,
        search: params.q,
        limit,
        offset,
      });

    rows = result.data;
    meta = result.meta;

    const supplierRecords = await supplierServerService.getAll();
    suppliers = supplierRecords ? JSON.parse(JSON.stringify(supplierRecords)) : [];
  } catch (err) {
    console.error("Failed to fetch good receipts on server:", err);
  }

  return (
    <GoodReceiptsClientWidget
      rows={JSON.parse(JSON.stringify(rows))}
      meta={meta}
      startDate={startDate}
      endDate={endDate}
      suppliers={suppliers}
    />
  );
}
