"use client";

import React from "react";
import SummaryCard from "@/components/common/SummaryCard";
import { formatCurrency } from "@/lib/utils";
import { Truck } from "lucide-react";

interface OutstandingGoodReceiptsCardProps {
  data?: {
    totalAmount: number;
    count: number;
  };
}

export default function OutstandingGoodReceiptsCard({ data }: OutstandingGoodReceiptsCardProps) {
  const totalAmount = data?.totalAmount ?? 0;
  const count = data?.count ?? 0;

  return (
    <SummaryCard
      label="Total Outstanding Good Receipts"
      value={
        <div className="flex flex-col gap-1">
          <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatCurrency(totalAmount)}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5" />
            <span>{count} pending verification</span>
          </div>
        </div>
      }
    />
  );
}
