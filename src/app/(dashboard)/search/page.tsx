import Loader from "@/components/common/Loader";
import SearchClientWidget from "@/components/widgets/SearchClientWidget";
import { categoryServerService } from "@/server/services";
import { Suspense } from "react";

export const metadata = {
  title: "Product Search | Inventory System",
  description: "Search across products and inventory combinations.",
};

/**
 * Server Component for Global Product Search.
 * Pre-fetches categories on the server to prevent client waterfall requests,
 * and wraps SearchClientWidget in Suspense for useSearchParams compatibility.
 */
export default async function GlobalSearchPage() {
  let categories: any[] = [];
  try {
    categories = await categoryServerService.getAll();
  } catch {
    categories = [];
  }

  return (
    <Suspense
      fallback={
        <div className="relative min-h-[300px]">
          <Loader isLoading={true} />
        </div>
      }
    >
      <SearchClientWidget initialCategories={categories} />
    </Suspense>
  );
}
