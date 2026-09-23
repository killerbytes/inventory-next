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
  const { id } = await params;
  let order: SalesOrderData | null = null;
  try {
    order = await salesServerService.get(Number(id));
  } catch (err) {
    console.error("Error fetching sales order details:", err);
    order = null;
  }
  if (!order) {
    notFound();
  }
  return (
    <SalesOrderDetailClientWidget
      initialData={JSON.parse(JSON.stringify(order))}
    />
  );
}
