import ProductDetailClientWidget from "@/components/widgets/ProductDetailClientWidget";
import { PERMISSIONS } from "@/lib/rbac";
import { requirePermission } from "@/server/auth/guards";
import {
  inventoryServerService,
  productServerService,
  supplierServerService,
} from "@/server/services";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(PERMISSIONS.VIEW_PRODUCTS);

  const { id } = await params;
  const productId = Number(id);
  let product: any = null;
  let priceHistory: any[] = [];
  let supplierHistory: any[] = [];
  let movements: any[] = [];

  try {
    product = await productServerService.get(productId);
  } catch (err) {
    console.error("Failed to query product from database:", err);
  }
  if (!product) {
    notFound();
  }

  try {
    const combinationIds = (product.combinations || []).map((c: any) => c.id);

    const [priceHistoryRes, supplierHistoryRes, movementsRes] =
      await Promise.all([
        inventoryServerService.getPriceHistory({ productId }),
        supplierServerService.getByProductId(productId),
        combinationIds.length > 0
          ? inventoryServerService.getMovements({ ids: combinationIds })
          : Promise.resolve({ data: [] }),
      ]);

    priceHistory = priceHistoryRes?.data || [];
    supplierHistory = Array.isArray(supplierHistoryRes)
      ? supplierHistoryRes
      : (supplierHistoryRes as any)?.data || [];
    movements = movementsRes?.data || [];
  } catch (err) {
    console.error("Error fetching product history:", err);
  }

  return (
    <ProductDetailClientWidget
      product={product ? JSON.parse(JSON.stringify(product)) : null}
      priceHistory={JSON.parse(JSON.stringify(priceHistory))}
      supplierHistory={JSON.parse(JSON.stringify(supplierHistory))}
      movements={JSON.parse(JSON.stringify(movements))}
    />
  );
}
