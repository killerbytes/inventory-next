import InvoicesClientWidget from "@/components/widgets/InvoicesClientWidget";
import { invoiceServerService } from "@/server/services/invoiceServer.service";
import { supplierServerService } from "@/server/services/supplierServer.service";
import { Meta } from "@/types/definitions";
import { endOfMonth, format, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = (await searchParams) || {};
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 25;

  const defaultStartDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const defaultEndDate = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const startDate = params.startDate || defaultStartDate;
  const endDate = params.endDate || defaultEndDate;

  let invoices: any[] = [];
  let suppliers: any[] = [];
  let meta: Meta = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };

  try {
    const [invResult, suppResult] = await Promise.all([
      invoiceServerService.getAll({
        startDate,
        endDate,
        status: params.status === "ALL" ? undefined : params.status,
        q: params.q,
        limit,
        page,
      }),
      supplierServerService.getAll(),
    ]);
    invoices = invResult.data || [];
    meta = invResult.meta;

    suppliers = suppResult || [];
  } catch (err) {
    console.error("Error fetching invoices on server:", err);
    invoices = [];
    suppliers = [];
  }

  return (
    <InvoicesClientWidget
      initialInvoices={JSON.parse(JSON.stringify(invoices))}
      initialSuppliers={JSON.parse(JSON.stringify(suppliers))}
      initialMeta={meta}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
