"use client";

import { DataTable } from "@/components/common/DataTable";
import CustomerModal from "@/components/modals/CustomerModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerData } from "@/schemas";
import { useUIStore } from "@/stores/uiStore";
import { createColumnHelper } from "@tanstack/react-table";
import { Edit, Plus } from "lucide-react";
import { useMemo } from "react";
import PageHeader from "../layout/PageHeader";

const columnHelper = createColumnHelper<CustomerData>();

export default function CustomersWidget({
  initialCustomers,
}: {
  initialCustomers: CustomerData[];
}) {
  const customers = initialCustomers;
  const { setCustomerModalOpen, editingCustomer } = useUIStore();

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Customer Name",
        cell: (info) => (
          <span className="font-semibold">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => info.getValue() || "N/A",
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => info.getValue() || "N/A",
      }),
      columnHelper.accessor("address", {
        header: "Address",
        cell: (info) => (
          <span className="text-muted-foreground">
            {info.getValue() || "N/A"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCustomerModalOpen(true, info.row.original)}
          >
            <Edit />
          </Button>
        ),
      }),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Accounts"
        description="Client directory, billing address records, and credit history"
      >
        <Button onClick={() => setCustomerModalOpen(true, null)}>
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Customers List ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={customers} searchKey="name" />
        </CardContent>
      </Card>

      <CustomerModal />
    </div>
  );
}
