import CategoriesWidget from "@/components/widgets/CategoriesWidget";
import { categoryServerService } from "@/server/services";

export const metadata = {
  title: "Categories | Inventory System",
  description: "Product categories management.",
};

export default async function CategoriesPage() {
  let categories: any[] = [];
  try {
    const records = await categoryServerService.getAll();
    categories = JSON.parse(JSON.stringify(records));
  } catch (err) {
    console.error("Failed to query Category from PostgreSQL:", err);
  }

  return <CategoriesWidget initialCategories={categories} />;
}
