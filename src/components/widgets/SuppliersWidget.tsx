"use client";

import { DataTable } from "@/components/common/DataTable";
import AddSupplierModal from "@/components/modals/SupplierModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupplierData } from "@/schemas";
import { useUIStore } from "@/stores/uiStore";
import { createColumnHelper } from "@tanstack/react-table";
import { Container, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import PageHeader from "../layout/PageHeader";

const columnHelper = createColumnHelper<SupplierData>();

export default function SuppliersWidget({
  initialSuppliers,
}: {
  initialSuppliers: SupplierData[];
}) {
  const { setSupplierModalOpen, editingSupplier } = useUIStore();

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Supplier Name",
        cell: ({ row }) => (
          <div>
            <Link
              className="font-semibold text-primary"
              href={`/suppliers/${row.original.id}`}
            >
              {row.original.name}
            </Link>
            <div className="text-xs text-muted-foreground">
              {row.original.address}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor("contact", {
        header: "Contact Person",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("phone", {
        header: "Phone Number",
        meta: {
          className: "text-xs",
        },
        cell: (info) => <div className="whitespace-pre">{info.getValue()}</div>,
      }),
      columnHelper.accessor("email", {
        header: "Email Address",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("address", {
        header: "Address",
        meta: {
          className: "text-xs",
        },
        cell: (info) => (
          <span className="text-muted-foreground">{info.getValue()}</span>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Directory"
        description="Vendor contacts, purchase orders history, and payment accounts."
      >
        <Button
          onClick={() => setSupplierModalOpen(true, null)}
          className="gap-2 bg-primary text-white"
        >
          <Plus className="h-4 w-4" /> Add Supplier
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Container className="h-5 w-5 text-primary" />
            Suppliers List ({initialSuppliers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={initialSuppliers}
            columns={columns}
            meta={{ emptyText: "No suppliers found in database." }}
          />
        </CardContent>
      </Card>

      <AddSupplierModal />
    </div>
  );
}
