"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Camera, CheckCircle, FileUp, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export default function OCRScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const handleProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a receipt photo first.");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setParsedData({
        supplier: "Holcim Philippines Inc.",
        referenceNo: "INV-99812",
        date: "2026-08-29",
        items: [
          {
            name: "Portland Cement 40kg",
            qty: 100,
            price: 240.0,
            total: 24000.0,
          },
          {
            name: "Deformed Steel Bar 10mm",
            qty: 50,
            price: 180.0,
            total: 9000.0,
          },
        ],
        totalAmount: 33000.0,
      });
      toast.success("Receipt scanned & parsed successfully!");
    }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          OCR Receipt Document Scanner
        </CardTitle>
        <CardDescription>
          Upload paper invoice photos or purchase receipts to auto-extract line
          items.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleProcess} className="space-y-4">
          <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
            <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <input
              type="file"
              accept="image/*,.pdf"
              id="ocr-file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="ocr-file"
              className="cursor-pointer text-sm font-semibold text-primary hover:underline"
            >
              Choose receipt image or snap photo
            </label>
            {file && (
              <p className="mt-2 text-xs font-mono text-emerald-600 font-medium">
                Loaded: {file.name}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!file || isProcessing}
            className="w-full h-11 text-base gap-2 bg-primary text-white"
          >
            <Sparkles className="h-4 w-4" />
            {isProcessing
              ? "Analyzing Receipt Document..."
              : "Parse Receipt Lines"}
          </Button>
        </form>

        {parsedData && (
          <div className="mt-6 p-4 rounded-xl bg-muted/40 border space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h4 className="font-bold text-base">{parsedData.supplier}</h4>
                <p className="text-xs text-muted-foreground">
                  Ref #: {parsedData.referenceNo}
                </p>
              </div>
              <Badge className="gap-1">
                <CheckCircle className="h-3 w-3" /> Scanned
              </Badge>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {parsedData.items.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex justify-between p-2 bg-background rounded-md border"
                >
                  <span>
                    {item.name} x {item.qty}
                  </span>
                  <span className="font-bold">₱{item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="text-right border-t pt-2 font-bold font-mono text-lg text-primary">
              Total Extracted: ₱
              {parsedData.totalAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
