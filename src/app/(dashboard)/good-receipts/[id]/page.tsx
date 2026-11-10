import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import GoodReceiptDetailClientWidget from "@/components/widgets/GoodReceiptDetailClientWidget";
import { GoodReceiptData } from "@/schemas";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GoodReceiptDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.VIEW_GOODS);
  const { id } = await params;
  const receipt: GoodReceiptData | null = await goodReceiptServerService.get(Number(id));
  if (!receipt) {
    notFound();
  }
  return (
    <GoodReceiptDetailClientWidget
      initialReceipt={receipt}
    />
  );
}
