import SalesInvoicesClientWidget from "@/components/widgets/SalesInvoicesClientWidget";
import { salesInvoiceServerService } from "@/server/services/salesInvoiceServer.service";
import { customerServerService } from "@/server/services/customerServer.service";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { Meta } from "@/types";

export const dynamic = "force-dynamic";

export default async function SalesInvoicesPage({
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
  let customers: any[] = [];
  let meta: Meta = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };

  try {
    const [invResult, custResult] = await Promise.all([
      salesInvoiceServerService.getAll({
        startDate,
        endDate,
        status: params.status === "ALL" ? undefined : params.status,
        customerId: params.customerId === "ALL" ? undefined : params.customerId,
        q: params.q,
        limit,
        page,
      }),
      customerServerService.getAll(),
    ]);
    invoices = invResult?.data || [];
    meta = invResult?.meta || meta;
    customers = custResult || [];
  } catch (err) {
    console.error("Error fetching sales invoices on server:", err);
    invoices = [];
    customers = [];
  }

  return (
    <SalesInvoicesClientWidget
      initialInvoices={JSON.parse(JSON.stringify(invoices))}
      initialCustomers={JSON.parse(JSON.stringify(customers))}
      initialMeta={meta}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
