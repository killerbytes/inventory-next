"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";

export default function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number | React.ReactNode;
}) {
  if (value === null || value === undefined) return null;

  return (
    <Card className="gap-2 py-4 h-full shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="px-4 flex flex-col h-full justify-between">
        <CardDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</CardDescription>
        <CardTitle className="text-lg font-bold mt-2">{value}</CardTitle>
      </CardContent>
    </Card>
  );
}
