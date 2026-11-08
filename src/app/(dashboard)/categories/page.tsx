import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import CategoriesWidget from "@/components/widgets/CategoriesWidget";
import { categoryServerService } from "@/server/services";

export const metadata = {
  title: "Categories | Inventory System",
  description: "Product categories management.",
};

export default async function CategoriesPage() {
  await requirePermission(PERMISSIONS.MANAGE_CATEGORIES);
  let categories: any[] = [];
  try {
    categories = await categoryServerService.getAll();
  } catch (err) {
    console.error("Failed to query Category from PostgreSQL:", err);
  }

  return <CategoriesWidget initialCategories={categories} />;
}
