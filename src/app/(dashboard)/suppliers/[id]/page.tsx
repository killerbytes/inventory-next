import SupplierDetailClientWidget from "@/components/widgets/SupplierDetailClientWidget";
import { PAGINATION } from "@/constants";
import { SupplierData } from "@/schemas";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { supplierServerService } from "@/server/services/supplierServer.service";
import { GoodReceiptSummary, Pagination } from "@/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = (await searchParams) || {};
  const page = Number(search.page) || PAGINATION.PAGE;
  const limit = Number(search.limit) || PAGINATION.PAGE_SIZE;
  const offset = (page - 1) * limit;

  let supplier: SupplierData | null = null;
  let receipts: any[] = [];
  let initialPagination: Pagination = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };
  let initialSummary: GoodReceiptSummary = {
    totalAmount: 0,
    totalPayableAmount: 0,
    totalReturnAmount: 0,
  };

  try {
    const [supplierResult, receiptsResult] = await Promise.all([
      supplierServerService.get(Number(id)),
      goodReceiptServerService.getBySupplierId(Number(id), {
        page,
        limit,
        offset,
      }),
    ]);

    supplier = supplierResult;
    receipts = receiptsResult.data;
    initialPagination = receiptsResult.pagination;
    initialSummary = receiptsResult.summary
  } catch (err) {
    console.error("Error querying supplier profile from PostgreSQL:", err);
  }

  if (!supplier) {
    notFound();
  }

  return <SupplierDetailClientWidget supplier={supplier} receipts={receipts} initialPagination={initialPagination} initialSummary={initialSummary} />;
}
