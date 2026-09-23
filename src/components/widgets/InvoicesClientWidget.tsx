"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import Pager from "@/components/common/Pager";
import PageHeader from "@/components/layout/PageHeader";
import InvoiceModal from "@/components/modals/InvoiceModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SupplierData } from "@/schemas/supplier.schema";
import { useUIStore } from "@/stores/uiStore";
import {
  INVOICE_STATUS,
  Meta,
  PAGINATION,
  STATUS_COLOR,
} from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import { CreditCard, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

const columnHelper = createColumnHelper<any>();

interface InvoicesClientWidgetProps {
  initialInvoices?: any[];
  initialSuppliers?: SupplierData[];
  initialMeta: Meta;
  startDate?: string;
  endDate?: string;
}

export default function InvoicesClientWidget({
  initialInvoices = [],
  initialSuppliers = [],
  initialMeta,
  startDate,
  endDate,
}: InvoicesClientWidgetProps) {
  const router = useRouter();
  const { setInvoiceModalOpen } = useUIStore();

  const { filters, setFilters } = useUrlFilters({
    page: PAGINATION.PAGE,
    limit: PAGINATION.PAGE_SIZE,
    status: "ALL",
    q: "",
    startDate,
    endDate,
  });

  const invoices = initialInvoices || [];

  const columns = useMemo(
    () => [
      columnHelper.accessor("invoiceNumber", {
        header: "Invoice #",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-semibold">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <span className="text-primary hover:underline cursor-pointer">
              {row.original.invoiceNumber || `INV-${row.original.id}`}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("supplier.name", {
        header: "Supplier",
        cell: ({ row }) => {
          const supplier = row.original.supplier;
          if (!supplier)
            return <span className="text-muted-foreground">—</span>;
          return (
            <Link
              href={`/suppliers/${supplier.id}`}
              className="text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {supplier.name}
            </Link>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status || INVOICE_STATUS.DRAFT;
          return <ColorBadge colorMap={STATUS_COLOR}>{String(s)}</ColorBadge>;
        },
      }),
      columnHelper.accessor("invoiceDate", {
        header: "Invoice Date",
        meta: {
          className: "text-xs text-muted-foreground",
        },
        cell: ({ row }) => formatDate(row.original.invoiceDate),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due Date",
        meta: {
          className: "text-xs text-muted-foreground",
        },
        cell: ({ row }) => formatDate(row.original.dueDate),
      }),
      columnHelper.accessor("totalAmount", {
        header: () => <div className="text-right">Total Amount</div>,
        meta: {
          headerClassName: "text-right",
          className: "text-right",
        },
        cell: ({ row }) => (
          <div className="text-right font-bold">
            {formatCurrency(Number(row.original.totalAmount || 0))}
          </div>
        ),
      }),
    ],
    [],
  );

  const handleRowClick = (item: any) => {
    if (item.status === INVOICE_STATUS.DRAFT) {
      setInvoiceModalOpen(true, item);
    } else {
      router.push(`/invoices/${item.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices Journal"
        description="Billing invoices issued for received good receipts purchases."
      >
        <Button
          onClick={() => {
            setInvoiceModalOpen(true, null);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Create Invoice
        </Button>
      </PageHeader>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice # or supplier..."
            value={filters.q}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, q: e.target.value, page: 1 }))
            }
            className="pl-9 h-10 text-xs"
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))
          }
          className="h-10 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
        >
          <option value="ALL">All Statuses</option>
          <option value={INVOICE_STATUS.DRAFT}>Draft</option>
          <option value={INVOICE_STATUS.POSTED}>Posted</option>
          <option value={INVOICE_STATUS.PARTIALLY_PAID}>Partially Paid</option>
          <option value={INVOICE_STATUS.PAID}>Paid</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={invoices}
        paginate={false}
        onRowClick={handleRowClick}
        renderFooter={(rows: any[]) => (
          <tr className="border-t font-semibold bg-muted/50">
            <td colSpan={5} className="p-3 text-right">
              Total Visible:
            </td>
            <td className="p-3 text-right font-mono font-bold text-base text-primary">
              {formatCurrency(
                rows.reduce(
                  (acc, curr) => acc + Number(curr.totalAmount || 0),
                  0,
                ),
              )}
            </td>
          </tr>
        )}
      />

      <Pager
        meta={initialMeta}
        filter={filters}
        setFilter={(action: any) => {
          const next = typeof action === "function" ? action(filters) : action;
          setFilters(next);
        }}
      />

      <InvoiceModal suppliers={initialSuppliers} />
    </div>
  );
}
