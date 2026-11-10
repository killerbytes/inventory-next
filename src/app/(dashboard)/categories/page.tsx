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
  categories = await categoryServerService.getAll();

  return <CategoriesWidget initialCategories={categories} />;
}
