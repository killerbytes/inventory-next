"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Server Component Error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-destructive/20 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Something went wrong!</CardTitle>
          <CardDescription className="text-sm">
            {error.message ||
              "An unexpected error occurred while loading dashboard data."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pt-2">
          <Button
            onClick={() => reset()}
            className="gap-2 bg-primary text-white"
          >
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
