"use client";

import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeDollarSign, DollarSign, Percent, TrendingUp } from "lucide-react";

interface ProfitClientWidgetProps {
  initialSummary?: any;
}

export default function ProfitClientWidget({
  initialSummary,
}: ProfitClientWidgetProps) {
  const summary = initialSummary || {
    totalSales: 0,
    estimatedCost: 0,
    netProfit: 0,
    marginPercentage: "0.0",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gross Profit & Margin Analytics"
        description="High-level breakdown of total sales revenue, estimated COGS, and gross profit margins."
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
            <div className="text-2xl font-bold font-mono text-emerald-600">
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
            <div className="text-2xl font-bold font-mono text-muted-foreground">
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
            <div className="text-2xl font-bold font-mono text-primary">
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
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {summary.marginPercentage}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
