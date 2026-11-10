import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import InvoicesClientWidget from "@/components/widgets/InvoicesClientWidget";
import { invoiceServerService } from "@/server/services/invoiceServer.service";
import { supplierServerService } from "@/server/services/supplierServer.service";
import { getBusinessCalendar } from "@/server/services/dateFilter";
import { Meta } from "@/types";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  await requirePermission(PERMISSIONS.MANAGE_INVOICES);
  const params = (await searchParams) || {};
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 25;

  // Business-timezone month; the server clock can still be on last month's date.
  const { monthStart: defaultStartDate, monthEnd: defaultEndDate } =
    getBusinessCalendar();

  const startDate = params.startDate || defaultStartDate;
  const endDate = params.endDate || defaultEndDate;

  let invoices: any[] = [];
  let suppliers: any[] = [];
  let meta: Meta = {
    total: 0,
    totalPages: 0,
    currentPage: 0,
  };

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

  suppliers = suppResult.data || [];

  return (
    <InvoicesClientWidget
      initialInvoices={invoices}
      initialSuppliers={suppliers}
      initialMeta={meta}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
