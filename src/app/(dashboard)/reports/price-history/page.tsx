import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import PriceHistoryClientWidget from "@/components/widgets/PriceHistoryClientWidget";
import { inventoryServerService } from "@/server/services/inventoryServer.service";

export const dynamic = "force-dynamic";

export default async function PriceHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  const params = (await searchParams) || {};
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 25;
  const q = params.q || undefined;

  let logs: any[] = [];
  let meta = {
    total: 0,
    totalPages: 0,
    currentPage: page,
  };

  const result = await inventoryServerService.getPriceHistory({
    page,
    limit,
    q,
  });
  logs = result.data || [];
  meta = result.meta;

  return (
    <PriceHistoryClientWidget
      initialLogs={JSON.parse(JSON.stringify(logs))}
      meta={meta}
    />
  );
}
