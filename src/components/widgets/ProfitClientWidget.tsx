"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/common/DataTable";
import Pager, { PagerMeta } from "@/components/common/Pager";
import ColorBadge from "@/components/common/ColorBadge";
import { UNIT_COLOR } from "@/constants";
import { createColumnHelper } from "@tanstack/react-table";
import { BadgeDollarSign, DollarSign, Percent, TrendingUp, Award } from "lucide-react";

export interface ProfitProductItem {
  combinationId: number;
  productId?: number | null;
  nameSnapshot: string;
  skuSnapshot?: string;
  unit: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginPercentage: string;
}

export interface ProfitSummaryData {
  totalSales: number;
  estimatedCost: number;
  netProfit: number;
  marginPercentage: string;
}

interface ProfitClientWidgetProps {
  initialSummary?: ProfitSummaryData;
  initialProducts?: ProfitProductItem[];
  meta?: PagerMeta;
}

const columnHelper = createColumnHelper<ProfitProductItem>();

export default function ProfitClientWidget({
  initialSummary,
  initialProducts = [],
  meta,
}: ProfitClientWidgetProps) {
  const summary = initialSummary || {
    totalSales: 0,
    estimatedCost: 0,
    netProfit: 0,
    marginPercentage: "0.0",
  };

  const products = initialProducts || [];
  const currentPage = meta?.currentPage || 1;
  const pageSize = 20;

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "rank",
        header: "Rank",
        cell: ({ row }) => (
          <div className="font-semibold text-muted-foreground flex items-center gap-1.5 text-xs">
            {row.index === 0 && currentPage === 1 ? (
              <Award className="h-4 w-4 text-amber-500 inline" />
            ) : null}
            <span>#{(currentPage - 1) * pageSize + row.index + 1}</span>
          </div>
        ),
      }),
      columnHelper.accessor("nameSnapshot", {
        header: "Product Combination",
        cell: ({ row }) => {
          const item = row.original;
          const href = item.productId ? `/products/${item.productId}` : "#";

          return (
            <div className="flex items-center gap-2">
              <ColorBadge colorMap={UNIT_COLOR}>{item.unit}</ColorBadge>
              {item.productId ? (
                <Link
                  href={href}
                  className="font-medium text-primary hover:underline"
                >
                  {item.nameSnapshot}
                </Link>
              ) : (
                <span className="font-medium">{item.nameSnapshot}</span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("skuSnapshot", {
        header: "SKU",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-mono">
            {row.original.skuSnapshot || "—"}
          </span>
        ),
      }),
      columnHelper.accessor("totalQuantity", {
        header: "Sold Qty",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="text-right font-medium block">
            {Number(row.original.totalQuantity || 0).toLocaleString()}
          </span>
        ),
      }),
      columnHelper.accessor("totalRevenue", {
        header: "Total Revenue",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="text-right font-medium text-emerald-600 block">
            ₱{Number(row.original.totalRevenue || 0).toLocaleString()}
          </span>
        ),
      }),
      columnHelper.accessor("totalCost", {
        header: "Estimated COGS",
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="text-right font-medium text-muted-foreground block">
            ₱{Number(row.original.totalCost || 0).toLocaleString()}
          </span>
        ),
      }),
      columnHelper.accessor("totalProfit", {
        header: "Gross Profit",
        meta: { align: "right" },
        cell: ({ row }) => {
          const profit = Number(row.original.totalProfit || 0);
          const isPositive = profit >= 0;
          return (
            <span
              className={`text-right font-bold block ${
                isPositive ? "text-primary" : "text-destructive"
              }`}
            >
              ₱{profit.toLocaleString()}
            </span>
          );
        },
      }),
      columnHelper.accessor("marginPercentage", {
        header: "Margin %",
        meta: { align: "right" },
        cell: ({ row }) => {
          const margin = Number(row.original.marginPercentage || 0);
          const isPositive = margin >= 0;
          return (
            <span
              className={`text-right font-semibold block ${
                isPositive ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {row.original.marginPercentage}%
            </span>
          );
        },
      }),
    ],
    [currentPage, pageSize],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gross Profit & Margin Analytics"
        description="High-level breakdown of total sales revenue, estimated COGS, and product combination profit margins."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sales Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ₱{Number(summary.totalSales || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Estimated COGS
            </CardTitle>
            <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              ₱{Number(summary.estimatedCost || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Gross Net Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ₱{Number(summary.netProfit || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Margin Percentage
            </CardTitle>
            <Percent className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {summary.marginPercentage}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Product Combination Profitability Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DataTable
            columns={columns}
            data={products}
            searchKey="nameSnapshot"
          />
          {meta && (meta.totalPages ?? 0) > 1 && <Pager meta={meta} />}
        </CardContent>
      </Card>
    </div>
  );
}
