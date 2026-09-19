import GoodReceiptsClientWidget from "@/components/widgets/GoodReceiptsClientWidget";
import { GoodReceiptData } from "@/schemas";
import { goodReceiptServerService } from "@/server/services";
import { Meta, PaginatedResponse } from "@/types/definitions";
import { endOfMonth, format, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function GoodReceiptsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = (await searchParams) || {};
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 25;
  const offset = (page - 1) * limit;

  const defaultStartDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultEndDate = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const startDate = params.startDate || defaultStartDate;
  const endDate = params.endDate || defaultEndDate;

  let rows: GoodReceiptData[] = [];
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
  } catch (err) {
    console.error("Failed to fetch good receipts on server:", err);
  }

  return (
    <GoodReceiptsClientWidget
      rows={JSON.parse(JSON.stringify(rows))}
      meta={meta}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
