import CreateGoodReceiptClientWidget from "@/components/widgets/CreateGoodReceiptClientWidget";
import { supplierServerService } from "@/server/services/supplierServer.service";

export const metadata = {
  title: "Create Good Receipt | Inventory System",
  description: "Receive supplier shipments and purchase orders.",
};

export const dynamic = "force-dynamic";

export default async function CreateGoodReceiptPage() {
  let suppliers: any[] = [];
  try {
    const records = await supplierServerService.getAll();
    suppliers = records ? JSON.parse(JSON.stringify(records)) : [];
  } catch (err) {
    console.error("Failed to query suppliers for Good Receipt create:", err);
  }

  return <CreateGoodReceiptClientWidget initialSuppliers={suppliers} />;
}
