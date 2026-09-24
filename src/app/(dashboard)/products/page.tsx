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
  try {
    categories = await categoryServerService.getAll();
  } catch (err) {
    console.error("Failed to query Category from PostgreSQL:", err);
  }

  return <ProductsWidget initialCategories={categories} />;
}
