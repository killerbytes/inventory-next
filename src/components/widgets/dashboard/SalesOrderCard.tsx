"use client";

import React from "react";
import SummaryCard from "@/components/common/SummaryCard";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SalesOrderCardProps {
  data?: {
    totalAmount: number;
    count: number;
    percentageChange: number;
  };
}

export default function SalesOrderCard({ data }: SalesOrderCardProps) {
  const totalAmount = data?.totalAmount ?? 0;
  const percentage = data?.percentageChange ?? 0;
  const isPositive = percentage >= 0;

  return (
    <SummaryCard
      label="Today's Sale"
      value={
        <div className="flex flex-col gap-1">
          <span className="text-xl font-bold font-mono text-foreground">
            {formatCurrency(totalAmount)}
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`flex items-center gap-0.5 font-semibold ${
                isPositive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {isPositive ? `+${percentage}%` : `${percentage}%`}
            </span>
            <span className="text-muted-foreground">vs yesterday</span>
          </div>
        </div>
      }
    />
  );
}
