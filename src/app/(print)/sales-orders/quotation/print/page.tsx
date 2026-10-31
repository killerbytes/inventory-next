"use client";

import SalesOrderPrintWidget from "@/components/widgets/SalesOrderPrintWidget";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import React, { useEffect, useState } from "react";

export default function QuotationPrintPage() {
  const [quotation, setQuotation] = useState<any | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem("quotation_print_data") ||
        localStorage.getItem("quotation_print_data");
      if (raw) {
        setQuotation(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to parse quotation data:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500 text-sm">
        Loading quotation preview...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          No Quotation Data Found
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          The quotation data could not be retrieved from the current session.
          Please return to the sales order form and click Print again.
        </p>
        <Button
          variant="outline"
          onClick={() => window.close()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Close Window
        </Button>
      </div>
    );
  }

  return <SalesOrderPrintWidget order={quotation} autoPrint={true} />;
}

