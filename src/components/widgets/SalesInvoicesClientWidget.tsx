"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import Pager from "@/components/common/Pager";
import PageHeader from "@/components/layout/PageHeader";
import SalesInvoiceModal from "@/components/modals/SalesInvoiceModal";
import { Button } from "@/components/ui/button";
import { useUrlFilters } from "@/hooks/useUrlFilters";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CustomerData } from "@/schemas/customer.schema";
import { useUIStore } from "@/stores/uiStore";
import { INVOICE_STATUS, PAGINATION, STATUS_COLOR } from "@/constants";
import { createColumnHelper } from "@tanstack/react-table";
import { FileText, Plus, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import DateRangePicker from "../common/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { Meta } from "@/types";

const columnHelper = createColumnHelper<any>();

interface SalesInvoicesClientWidgetProps {
  initialInvoices?: any[];
  initialCustomers?: CustomerData[];
  initialMeta: Meta;
  startDate?: string;
  endDate?: string;
}

export default function SalesInvoicesClientWidget({
  initialInvoices = [],
  initialCustomers = [],
  initialMeta,
  startDate,
  endDate,
}: SalesInvoicesClientWidgetProps) {
  const router = useRouter();
  const { setSalesInvoiceModalOpen } = useUIStore();

  const { filters, setFilters } = useUrlFilters({
    page: PAGINATION.PAGE,
    limit: PAGINATION.PAGE_SIZE,
    status: "ALL",
    customerId: "ALL",
    q: "",
    startDate,
    endDate,
  });

  const invoices = initialInvoices || [];

  const dateRange: DateRange = useMemo(
    () => ({
      from: filters.startDate ? parseISO(filters.startDate) : undefined,
      to: filters.endDate ? parseISO(filters.endDate) : undefined,
    }),
    [filters.startDate, filters.endDate]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("invoiceNumber", {
        header: "Statement #",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-semibold">
            <FileText className="h-4 w-4 text-indigo-600" />
            <Link
              href={`/sales-invoices/${row.original.id}`}
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.invoiceNumber}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor("customer.name", {
        header: "Customer",
        cell: ({ row }) => {
          const customer = row.original.customer;
          if (!customer) return <span className="text-muted-foreground italic">Cash Customer</span>;
          return (
            <Link
              href={`/customers`}
              className="font-medium hover:underline text-slate-800 dark:text-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              {customer.name}
            </Link>
          );
        },
      }),
      columnHelper.accessor("invoiceDate", {
        header: "Statement Date",
        meta: {
          className: "text-xs text-muted-foreground",
        },
        cell: ({ row }) => formatDate(row.original.invoiceDate),
      }),
      columnHelper.accessor("salesInvoiceLines", {
        header: "Orders",
        cell: ({ row }) => {
          const count = row.original.salesInvoiceLines?.length || 0;
          return (
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-medium">
              {count} order{count === 1 ? "" : "s"}
            </span>
          );
        },
      }),
      columnHelper.accessor("totalCharges", {
        header: () => <div className="text-right">Total Charges</div>,
        meta: {
          align: "right",
        },
        cell: ({ row }) => formatCurrency(row.original.totalCharges),
      }),
      columnHelper.accessor("amountDue", {
        header: () => <div className="text-right">Amount Due</div>,
        meta: {
          align: "right",
          className: "font-bold text-emerald-600",
        },
        cell: ({ row }) => formatCurrency(row.original.amountDue),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => (
          <ColorBadge colorMap={STATUS_COLOR}>
            {String(row.original.status || "DRAFT")}
          </ColorBadge>
        ),
      }),
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Invoices & Statements"
        description="Consolidated customer billing statements aggregating multiple sales orders."
      >
        <Button
          onClick={() => setSalesInvoiceModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Statement
        </Button>
      </PageHeader>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <InputGroup className="w-full sm:w-64">
            <InputGroupInput
              value={filters.q || ""}
              onChange={(e) => setFilters({ q: e.target.value, page: 1 })}
              placeholder="Search statement #..."
            />
            <InputGroupAddon>
              <SearchIcon className="h-4 w-4 text-muted-foreground" />
            </InputGroupAddon>
          </InputGroup>


          <DateRangePicker
            value={dateRange}
            commitOnClose
            onChange={(range) =>
              setFilters({
                startDate: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
                endDate: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
                page: 1,
              })
            }
          />

          <Select
            value={filters.status || "ALL"}
            onValueChange={(val) =>
              setFilters({ ...filters, status: !val ? "ALL" : val, page: 1 })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value={INVOICE_STATUS.DRAFT}>Draft</SelectItem>
              <SelectItem value={INVOICE_STATUS.POSTED}>Posted</SelectItem>
              <SelectItem value={INVOICE_STATUS.PAID}>Paid</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.customerId || "ALL"}
            onValueChange={(val) =>
              setFilters({ ...filters, customerId: !val ? "ALL" : val, page: 1 })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Customers</SelectItem>
              {initialCustomers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="border rounded-md overflow-hidden bg-background">
        <DataTable
          data={invoices}
          columns={columns}
          onRowClick={(row) => router.push(`/sales-invoices/${row.id}`)}
        />
      </div>

      {/* Pagination */}
      <Pager
        meta={initialMeta}
        filter={filters}
        setFilter={(action: any) => {
          const next = typeof action === "function" ? action(filters) : action;
          setFilters(next);
        }}
      />

      {/* Creation Modal */}
      <SalesInvoiceModal customers={initialCustomers} />
    </div>
  );
}
