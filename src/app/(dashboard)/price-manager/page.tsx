"use client";

import { DataTable } from "@/components/common/DataTable";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getCombinationsByIdsAction,
  updatePricesAction,
} from "@/server/actions/product.actions";
import { ColumnDef } from "@tanstack/react-table";
import {
  AlertCircle,
  BadgePercent,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import Papa from "papaparse";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";

interface PriceManagerRow {
  id: number;
  name: string;
  sku?: string;
  unit?: string;
  price?: number;
  newPrice: number;
  averagePrice?: number;
  lastChangedAt?: string | null;
  isValid: boolean;
}

export default function PriceManagerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PriceManagerRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const processCSV = (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        try {
          const rawRows = results.data || [];
          const filtered = rawRows.filter(
            (item: any) =>
              item["NEW PRICE"] || item["newPrice"] || item["New Price"],
          );

          if (filtered.length === 0) {
            toast.error("No rows with 'NEW PRICE' column found in CSV.");
            setIsLoading(false);
            return;
          }

          const ids = filtered
            .map((item: any) => Number(item.ID || item.id || item.Id))
            .filter((id: number) => !isNaN(id) && id > 0);

          if (ids.length === 0) {
            toast.error("No valid 'ID' column found in CSV rows.");
            setIsLoading(false);
            return;
          }

          const existingCombinations = await getCombinationsByIdsAction(ids);

          const processedRows: PriceManagerRow[] = existingCombinations.map(
            (combo: any) => {
              const matchingRow = filtered.find(
                (f: any) => Number(f.ID || f.id || f.Id) === Number(combo.id),
              );
              const rawNewPrice = String(
                matchingRow["NEW PRICE"] ||
                  matchingRow["newPrice"] ||
                  matchingRow["New Price"] ||
                  "0",
              );
              const cleanNewPrice = parseFloat(
                rawNewPrice.replace(/[^0-9.-]+/g, ""),
              );

              const lastHistory =
                combo.priceHistories && combo.priceHistories.length > 0
                  ? combo.priceHistories[combo.priceHistories.length - 1]
                  : null;

              return {
                id: combo.id,
                name:
                  combo.name || combo.product?.name || "Product Combination",
                sku: combo.sku,
                unit: combo.unit || "PCS",
                price: Number(combo.price) || 0,
                newPrice: isNaN(cleanNewPrice) ? 0 : cleanNewPrice,
                averagePrice: Number(combo.inventory?.averagePrice) || 0,
                lastChangedAt: lastHistory?.changedAt || null,
                isValid: !isNaN(cleanNewPrice) && cleanNewPrice > 0,
              };
            },
          );

          setPreviewData(processedRows);
          toast.success(
            `Matched ${processedRows.length} combinations from database!`,
          );
        } catch (err: any) {
          console.error("Error processing price CSV:", err);
          toast.error(
            err?.message || "Failed to process price CSV against database",
          );
        } finally {
          setIsLoading(false);
        }
      },
      error: (error: any) => {
        setIsLoading(false);
        toast.error(`CSV Parsing Error: ${error.message}`);
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processCSV(selectedFile);
  };

  const handleApplyUpdates = async () => {
    const validItems = previewData.filter((i) => i.isValid);
    if (validItems.length === 0) {
      toast.error("No valid price updates to apply.");
      return;
    }

    setIsUpdating(true);
    try {
      await updatePricesAction(
        validItems.map((item) => ({
          id: item.id,
          newPrice: item.newPrice,
        })),
      );

      toast.success(
        `Successfully updated ${validItems.length} combination prices!`,
      );
      setFile(null);
      setPreviewData([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update prices.");
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,ID,NEW PRICE\n1,150.00\n2,275.50\n3,89.00";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "price_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo<ColumnDef<PriceManagerRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">
            #{row.original.id}
          </span>
        ),
        meta: { className: "w-16" },
      },
      {
        accessorKey: "name",
        header: "Product Combination",
        cell: ({ row }) => (
          <div>
            <div className="font-semibold text-sm">{row.original.name}</div>
            <div className="text-xs text-muted-foreground font-mono">
              SKU: {row.original.sku || "N/A"}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "unit",
        header: "Unit",
        cell: ({ row }) => (
          <Badge variant="outline" className="uppercase font-mono text-xs">
            {row.original.unit}
          </Badge>
        ),
        meta: { className: "w-20 text-center" },
      },
      {
        accessorKey: "averagePrice",
        header: "Avg Cost",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatCurrency(row.original.averagePrice ?? 0)}
          </span>
        ),
        meta: { className: "w-28 text-right" },
      },
      {
        accessorKey: "lastChangedAt",
        header: "Last Changed",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.lastChangedAt
              ? formatDate(row.original.lastChangedAt)
              : "Never"}
          </span>
        ),
        meta: { className: "w-28" },
      },
      {
        accessorKey: "price",
        header: "Current Price",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {formatCurrency(row.original.price ?? 0)}
          </span>
        ),
        meta: { className: "w-28 text-right" },
      },
      {
        accessorKey: "newPrice",
        header: "New Price",
        cell: ({ row }) => {
          const isHigher = row.original.newPrice > (row.original.price ?? 0);
          const isLower = row.original.newPrice < (row.original.price ?? 0);

          return (
            <div className="flex flex-col items-end">
              <span
                className={`font-mono font-bold text-sm ${isHigher ? "text-emerald-600" : isLower ? "text-rose-600" : ""}`}
              >
                {formatCurrency(row.original.newPrice)}
              </span>
              {row.original.price && (
                <span className="text-[10px] text-muted-foreground">
                  Diff:{" "}
                  {formatCurrency(row.original.newPrice - row.original.price)}
                </span>
              )}
            </div>
          );
        },
        meta: { className: "w-32 text-right" },
      },
      {
        accessorKey: "isValid",
        header: "Status",
        cell: ({ row }) =>
          row.original.isValid ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Valid
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" /> Invalid
            </Badge>
          ),
        meta: { className: "w-24 text-center" },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Price Manager"
        description="Bulk update product combination prices via CSV spreadsheet import with transactional history audit."
      >
        <Button
          variant="outline"
          onClick={downloadSampleTemplate}
          className="gap-2"
        >
          <Download className="h-4 w-4" /> Download Sample CSV
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            CSV File Upload
          </CardTitle>
          <CardDescription>
            Upload a CSV containing columns: <strong>ID</strong> (Product
            Combination ID) and <strong>NEW PRICE</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/40 transition-colors">
            <input
              type="file"
              accept=".csv,text/csv"
              id="csv-file-input"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading || isUpdating}
            />
            <label
              htmlFor="csv-file-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
              </div>
              <span className="font-semibold text-base">
                {isLoading
                  ? "Querying database for combination matches..."
                  : "Click or drag CSV file to upload"}
              </span>
              <span className="text-xs text-muted-foreground">
                {file ? `Selected file: ${file.name}` : "Accepted format: .csv"}
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {previewData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BadgePercent className="h-5 w-5 text-emerald-600" />
                Price Change Preview
              </CardTitle>
              <CardDescription>
                Review proposed price adjustments before persisting changes to
                the database.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setPreviewData([]);
                }}
                disabled={isUpdating}
              >
                Clear
              </Button>
              <Button
                onClick={handleApplyUpdates}
                disabled={
                  isUpdating ||
                  previewData.filter((i) => i.isValid).length === 0
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Apply {previewData.filter((i) => i.isValid).length} Price
                Updates
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <DataTable columns={columns} data={previewData} searchKey="name" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
