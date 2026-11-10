import ProductsWidget from "@/components/widgets/ProductsWidget";
import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import { categoryServerService } from "@/server/services";

export const metadata = {
  title: "Products | Inventory System",
  description: "Manage product inventory items, SKUs, and pricing.",
};

export default async function ProductsPage() {
  await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

  let categories: any[] = [];
  categories = await categoryServerService.getAll();

  return <ProductsWidget initialCategories={categories} />;
}
