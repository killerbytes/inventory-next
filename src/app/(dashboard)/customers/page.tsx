import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import CustomersWidget from "@/components/widgets/CustomersWidget";
import { customerServerService } from "@/server/services/customerServer.service";

export const metadata = {
  title: "Customers | Inventory System",
  description: "Customer accounts directory and billing records.",
};

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  await requirePermission(PERMISSIONS.MANAGE_CUSTOMERS);
  let customers: any[] = [];
  customers = await customerServerService.getAll();

  return <CustomersWidget initialCustomers={customers} />;
}
