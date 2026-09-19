"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface WeekSalesGraphProps {
  data?: Array<{ name: string; totalAmount: number }>;
}

export default function WeekSalesGraph({ data = [] }: WeekSalesGraphProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Weekly Sales</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                width={80}
                dataKey="totalAmount"
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => formatCurrency(Number(value))}
              />
              <Tooltip
                formatter={(value) => [
                  formatCurrency(Number(value)),
                  "Total Sales",
                ]}
                contentStyle={{
                  borderRadius: "8px",
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                }}
              />
              <Bar
                dataKey="totalAmount"
                fill="var(--chart-1)"
                radius={[10, 10, 0, 0]}
                activeBar={{ fill: "var(--chart-2)" }}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
