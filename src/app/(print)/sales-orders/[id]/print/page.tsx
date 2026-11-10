import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import SalesOrderPrintWidget from "@/components/widgets/SalesOrderPrintWidget";
import { SalesOrderData } from "@/schemas";
import { salesServerService } from "@/server/services/salesServer.service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SalesOrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ auto?: string }>;
}) {
  await requirePermission(PERMISSIONS.VIEW_SALES);
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const autoPrint = query?.auto === "true" || query?.auto === "1";

  let order: SalesOrderData | null = null;
  order = await salesServerService.get(Number(id));

  if (!order) {
    notFound();
  }

  return (
    <SalesOrderPrintWidget
      order={JSON.parse(JSON.stringify(order))}
      autoPrint={autoPrint}
    />
  );
}

