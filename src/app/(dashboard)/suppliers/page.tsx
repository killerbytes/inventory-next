import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import SuppliersWidget from "@/components/widgets/SuppliersWidget";
import { SupplierData } from "@/schemas";
import { supplierServerService } from "@/server/services/supplierServer.service";
import { Pagination } from "@/types";

export const metadata = {
  title: "Suppliers | Inventory System",
  description: "Supplier vendor contacts and payment accounts.",
};

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  await requirePermission(PERMISSIONS.MANAGE_SUPPLIERS);
  let suppliers: { data: SupplierData[]; pagination: Pagination };
  suppliers = await supplierServerService.getAll();

  return <SuppliersWidget initialSuppliers={suppliers.data} />;
}
