import CustomersWidget from "@/components/widgets/CustomersWidget";
import { customerServerService } from "@/server/services/customerServer.service";

export const metadata = {
  title: "Customers | Inventory System",
  description: "Customer accounts directory and billing records.",
};

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  let customers: any[] = [];
  try {
    const records = await customerServerService.getAll();
    customers = records ? JSON.parse(JSON.stringify(records)) : [];
  } catch (err) {
    console.error("Failed to query Customer from PostgreSQL:", err);
  }

  return <CustomersWidget initialCustomers={customers} />;
}
