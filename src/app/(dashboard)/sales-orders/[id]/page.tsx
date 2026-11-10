import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import SalesOrderDetailClientWidget from "@/components/widgets/SalesOrderDetailClientWidget";
import { SalesOrderData } from "@/schemas";
import { salesServerService } from "@/server/services/salesServer.service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SalesOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.VIEW_SALES);
  const { id } = await params;
  let order: SalesOrderData | null = null;
  order = await salesServerService.get(Number(id));
  if (!order) {
    notFound();
  }
  return (
    <SalesOrderDetailClientWidget
      initialData={JSON.parse(JSON.stringify(order))}
    />
  );
}
