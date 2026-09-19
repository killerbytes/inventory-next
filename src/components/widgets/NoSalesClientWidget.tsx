"use client";

import { DataTable } from "@/components/common/DataTable";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { createColumnHelper } from "@tanstack/react-table";
import { Annoyed } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const columnHelper = createColumnHelper<any>();

interface NoSalesClientWidgetProps {
  initialProducts?: any[];
}

export default function NoSalesClientWidget({
  initialProducts = [],
}: NoSalesClientWidgetProps) {
  const records = initialProducts || [];

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: ({ row }) => (
          <Link
            href={`/products/${row.original.id}`}
            className="font-semibold text-primary hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      }),
      columnHelper.accessor("baseUnit", {
        header: "Base Unit",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.baseUnit || "PCS"}</Badge>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: "Movement Status",
        cell: () => (
          <Badge variant="destructive" className="gap-1">
            <Annoyed className="h-3 w-3" /> Dead Stock (No Recent Sales)
          </Badge>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dead Stock & Slow Movers Report"
        description="Monitoring products with zero sales activity over recent periods."
      />

      <DataTable columns={columns} data={records} searchKey="name" />
    </div>
  );
}
