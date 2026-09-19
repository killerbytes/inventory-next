"use client";

import React from "react";
import SummaryCard from "@/components/common/SummaryCard";
import { formatCurrency } from "@/lib/utils";
import { BadgeDollarSign } from "lucide-react";

interface LastMonthProfitCardProps {
  data?: {
    totalProfit: number;
  };
}

export default function LastMonthProfitCard({ data }: LastMonthProfitCardProps) {
  const totalProfit = data?.totalProfit ?? 0;

  return (
    <SummaryCard
      label="Last Month's Profit"
      value={
        <div className="flex flex-col gap-1">
          <span className="text-xl font-bold font-mono text-emerald-600">
            {formatCurrency(totalProfit)}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <BadgeDollarSign className="h-3.5 w-3.5 text-emerald-600" />
            <span>Closed ledger margin</span>
          </div>
        </div>
      }
    />
  );
}
