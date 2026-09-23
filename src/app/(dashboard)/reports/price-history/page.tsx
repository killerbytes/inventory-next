import PriceHistoryClientWidget from "@/components/widgets/PriceHistoryClientWidget";
import { inventoryServerService } from "@/server/services/inventoryServer.service";

export const dynamic = "force-dynamic";

export default async function PriceHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
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

  try {
    const result = await inventoryServerService.getPriceHistory({
      page,
      limit,
      q,
    });
    logs = result.data || [];
    meta = result.meta;
  } catch (err) {
    console.error("Error fetching price history logs:", err);
  }

  return (
    <PriceHistoryClientWidget
      initialLogs={JSON.parse(JSON.stringify(logs))}
      meta={meta}
    />
  );
}
