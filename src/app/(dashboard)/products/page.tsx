import ProductsWidget from "@/components/widgets/ProductsWidget";
import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import { productServerService } from "@/server/services";

export const metadata = {
  title: "Products | Inventory System",
  description: "Manage product inventory items, SKUs, and pricing.",
};

export default async function ProductsPage() {
  await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

  let products: any[] = [];
  try {
    const records = await productServerService.getAll();

    products = JSON.parse(JSON.stringify(records));
  } catch (err) {
    console.error("Failed to query Product from PostgreSQL:", err);
  }

  return <ProductsWidget initialProducts={products} />;
}
