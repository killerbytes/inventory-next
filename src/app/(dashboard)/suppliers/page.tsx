import SuppliersWidget from "@/components/widgets/SuppliersWidget";
import { SupplierData } from "@/schemas";
import { supplierServerService } from "@/server/services/supplierServer.service";

export const metadata = {
  title: "Suppliers | Inventory System",
  description: "Supplier vendor contacts and payment accounts.",
};

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  let suppliers: SupplierData[] = [];
  try {
    const records = await supplierServerService.getAll();
    suppliers = records ? JSON.parse(JSON.stringify(records)) : [];
  } catch (err) {
    console.error("Failed to query Supplier from PostgreSQL:", err);
  }

  return <SuppliersWidget initialSuppliers={suppliers} />;
}
