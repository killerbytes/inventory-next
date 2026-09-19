"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface MostPopularProps {
  data?: any[];
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function MostPopular({ data = [] }: MostPopularProps) {
  const chartData = useMemo(() => {
    return data.map((item, idx) => ({
      name:
        item.combinations?.name ||
        item.name ||
        `Product #${item.combinationId || idx + 1}`,
      value: Number(item.transactionCount || 0),
    }));
  }, [data]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Most Popular</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <div className="w-full h-[260px]">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No popular products data recorded yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="40%"
                  cy="50%"
                  outerRadius="90%"
                  innerRadius="70%"
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`${val} orders`, "Orders"]}
                  itemStyle={{ fontSize: 12 }}
                  contentStyle={{
                    borderRadius: "8px",
                    background: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                  }}
                />
                <Legend
                  itemSorter="dataKey"
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{
                    fontSize: "12px",
                    maxWidth: "45%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
