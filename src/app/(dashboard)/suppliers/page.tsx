import SuppliersWidget from "@/components/widgets/SuppliersWidget";
import { SupplierData } from "@/schemas";
import { supplierServerService } from "@/server/services/supplierServer.service";
import { Pagination } from "@/constants";

export const metadata = {
  title: "Suppliers | Inventory System",
  description: "Supplier vendor contacts and payment accounts.",
};

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  let suppliers: { data: SupplierData[]; pagination: Pagination };
  try {
    suppliers = await supplierServerService.getAll();
  } catch (err) {
    console.error("Failed to query Supplier from PostgreSQL:", err);
    suppliers = { data: [], pagination: { total: 0, totalPages: 0, currentPage: 0 } };
  }

  return <SuppliersWidget initialSuppliers={suppliers.data} />;
}
