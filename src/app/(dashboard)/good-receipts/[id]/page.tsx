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
  const { id } = await params;
  let receipt: GoodReceiptData | null = null;
  try {
    const data = await goodReceiptServerService.get(Number(id));

    if (!data) {
      notFound();
    }
    receipt = data;
  } catch (err) {
    console.error("Error fetching good receipt details:", err);
    receipt = null;
  }
  if (!receipt) {
    notFound();
  }

  return (
    <GoodReceiptDetailClientWidget
      initialReceipt={JSON.parse(JSON.stringify(receipt))}
    />
  );
}
