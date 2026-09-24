"use client";

import ProductModal from "@/components/modals/ProductModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryData, ProductData } from "@/schemas";
import { useUIStore } from "@/stores/uiStore";
import { UserRole } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { Package, Plus } from "lucide-react";
import { RoleGuard } from "../common/RoleGuard";
import PageHeader from "../layout/PageHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { LazyProductsByCategory } from "./products/LazyProductsByCategory";

const columnHelper = createColumnHelper<ProductData>();

export default function ProductsWidget({
  initialCategories,
}: {
  initialCategories: CategoryData[];
}) {
  const categories = initialCategories;
  const { setProductModalOpen } = useUIStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Stock"
        description="Catalog inventory items, SKU barcoding, unit prices, and live stock balances."
      >
        <div className="flex gap-2 items-center">
          <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
            <Button
              onClick={() => setProductModalOpen(true)}
              className="bg-primary text-white gap-2"
            >
              <Plus className="h-4 w-4" /> Add Product
            </Button>
          </RoleGuard>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion>
            {categories?.map((i) => (
              <AccordionItem key={i.id} value={i.id}>
                <AccordionTrigger>{i.name}</AccordionTrigger>
                <AccordionContent>
                  <LazyProductsByCategory categoryId={i.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <ProductModal />
    </div>
  );
}
