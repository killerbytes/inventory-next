"use client";

import DnDTable from "@/components/common/DnDTable";
import CategoryModal from "@/components/modals/CategoryModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/rbac";
import { CategoryData } from "@/schemas";
import {
  deleteCategoryAction,
  updateCategorySortAction,
} from "@/server/actions/category.actions";
import { useUIStore } from "@/stores/uiStore";
import { createColumnHelper } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import PermissionGuard from "../common/PermissionGuard";
import PageHeader from "../layout/PageHeader";

const columnHelper = createColumnHelper<CategoryData>();

export default function CategoriesWidget({
  initialCategories,
}: {
  initialCategories: CategoryData[];
}) {
  const router = useRouter();
  const { setCategoryModalOpen, editingCategory } = useUIStore();

  const isEditing = Boolean(editingCategory?.id);

  const handleSortSubmit = async (sortedData: CategoryData[]) => {
    try {
      const sortedIds = sortedData.map((c) => c.id);
      await updateCategorySortAction(sortedIds);
      toast.success("Category sort order updated!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update category order");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      await deleteCategoryAction(id);
      // setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success(`Category "${name}" deleted`);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete category");
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue()}</span>
        ),
        meta: { className: "w-16" },
      }),
      columnHelper.accessor("name", {
        header: "Category Name",
        cell: (info) => (
          <span className="font-semibold">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => (
          <span className="text-muted-foreground text-sm">
            {info.getValue() || "N/A"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: "Status",
        cell: () => <Badge variant="default">ACTIVE</Badge>,
        meta: { className: "w-24" },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <PermissionGuard permission={PERMISSIONS.MANAGE_CATEGORIES}>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setCategoryModalOpen(true, row.original);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-rose-600 hover:text-rose-800"
                onClick={() => handleDelete(row.original.id, row.original.name)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </PermissionGuard>
          </div>
        ),
        meta: { className: "w-20 text-right" },
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage product categories, hierarchy, and drag-and-drop sort order."
      >
        <Button
          onClick={() => {
            setCategoryModalOpen(true);
          }}
          className="gap-2 bg-primary text-white"
        >
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </PageHeader>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm p-4">
        <DnDTable
          columns={columns}
          data={initialCategories}
          onSubmit={handleSortSubmit}
        />
      </div>

      <CategoryModal />
    </div>
  );
}
