import SupplierDetailClientWidget from "@/components/widgets/SupplierDetailClientWidget";
import { SupplierData } from "@/schemas";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { supplierServerService } from "@/server/services/supplierServer.service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let supplier: SupplierData | null = null;
  let receipts: any[] = [];

  try {
    const [supplierResult, receiptsResult] = await Promise.all([
      supplierServerService.get(Number(id)),
      goodReceiptServerService.getAll({ supplierId: Number(id) }),
    ]);

    supplier = JSON.parse(JSON.stringify(supplierResult));

    receipts = JSON.parse(JSON.stringify(receiptsResult));
  } catch (err) {
    console.error("Error querying supplier profile from PostgreSQL:", err);
  }
  console.log(supplier, receipts);

  if (!supplier) {
    notFound();
  }

  return <SupplierDetailClientWidget supplier={supplier} receipts={receipts} />;
}
