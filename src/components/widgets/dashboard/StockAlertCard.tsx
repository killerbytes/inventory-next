"use client";

import React from "react";
import SummaryCard from "@/components/common/SummaryCard";
import { TriangleAlert } from "lucide-react";

interface StockAlertCardProps {
  data?: {
    count: number;
    items?: any[];
  };
}

export default function StockAlertCard({ data }: StockAlertCardProps) {
  const count = data?.count ?? 0;

  return (
    <SummaryCard
      label="Low Stock"
      value={
        <div className="flex flex-col gap-1">
          <span className="text-xl font-bold font-mono text-rose-600 flex items-center gap-1.5">
            <TriangleAlert className="h-5 w-5 text-rose-600" />
            {count}
          </span>
          <span className="text-xs text-muted-foreground">Items below reorder level</span>
        </div>
      }
    />
  );
}
