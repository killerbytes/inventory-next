"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, Upload, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { parseReceiptAction } from "@/server/actions/ocr.actions";
import { toast } from "sonner";

export interface ParsedArticle {
  quantity: number;
  unit: string;
  article: string;
  price: number;
  selectedCombinationId?: number;
  suggestedProducts?: any[];
}

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyItems?: (items: { combinationId: number; name: string; quantity: number; purchasePrice: number }[]) => void;
}

export default function OCRModal({ isOpen, onClose, onApplyItems }: OCRModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [receiptNo, setReceiptNo] = useState("");
  const [articles, setArticles] = useState<ParsedArticle[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImagePreview(URL.createObjectURL(file));
    setIsUploading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      toast.loading("Analyzing receipt with Gemini AI...", { id: "ocr-parse" });
      const result = await parseReceiptAction(formData);
      toast.dismiss("ocr-parse");

      if (result) {
        setReceiptNo(result.receiptNo || `REC-${Date.now()}`);
        const parsedArticles = (result.articles || []).map((art: any) => {
          const bestMatch = art.suggestedProducts?.[0]?.bestMatchCombination || art.suggestedProducts?.[0]?.combinations?.[0];
          return {
            quantity: Number(art.quantity) || 1,
            unit: art.unit || "PCS",
            article: art.article || "Item",
            price: Number(art.price) || 0,
            selectedCombinationId: bestMatch?.id ? Number(bestMatch.id) : undefined,
            suggestedProducts: art.suggestedProducts || [],
          };
        });
        setArticles(parsedArticles);
        toast.success(`Gemini detected ${parsedArticles.length} line items!`);
      }
    } catch (err: any) {
      toast.dismiss("ocr-parse");
      toast.error(err?.message || "Failed to parse receipt image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApply = () => {
    if (articles.length === 0) {
      toast.error("No articles available to apply.");
      return;
    }

    const applied = articles
      .filter((art) => art.selectedCombinationId)
      .map((art) => {
        const combo = art.suggestedProducts
          ?.flatMap((p) => p.combinations || [])
          ?.find((c) => c.id === art.selectedCombinationId);

        return {
          combinationId: Number(art.selectedCombinationId),
          name: combo?.name || art.article,
          quantity: art.quantity,
          purchasePrice: art.price || combo?.price || 0,
        };
      });

    if (applied.length === 0) {
      toast.error("Please match at least one product with an inventory item.");
      return;
    }

    if (onApplyItems) {
      onApplyItems(applied);
    }
    toast.success(`Imported ${applied.length} items from receipt!`);
    onClose();
  };

  const removeItem = (idx: number) => {
    setArticles(articles.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Receipt & Invoice OCR Scanner
          </DialogTitle>
          <DialogDescription>
            Upload a paper receipt, purchase order, or physical invoice to extract line items automatically using Gemini AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 my-2">
          {/* File Upload / Camera Zone */}
          <div className="border-2 border-dashed rounded-xl p-6 text-center hover:bg-muted/30 transition-colors">
            <input
              type="file"
              id="receipt-file-input"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <label
              htmlFor="receipt-file-input"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="p-3 bg-purple-100 dark:bg-purple-950/50 rounded-full text-purple-600">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Upload className="h-6 w-6" />
                )}
              </div>
              <span className="font-semibold text-sm">
                {isUploading ? "Processing image with Gemini AI..." : "Click or drag to upload receipt photo"}
              </span>
              <span className="text-xs text-muted-foreground">
                Supports JPG, PNG, WEBP (Paper receipts, invoices, delivery orders)
              </span>
            </label>
          </div>

          {/* Results Table */}
          {articles.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm">
                  Parsed Line Items ({articles.length})
                </h4>
                {receiptNo && (
                  <Badge variant="outline" className="font-mono">
                    Ref: {receiptNo}
                  </Badge>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-3 py-2 text-left">Scanned Article</th>
                      <th className="px-3 py-2 text-left w-24">Qty</th>
                      <th className="px-3 py-2 text-left w-28">Unit Price</th>
                      <th className="px-3 py-2 text-left">Matched Inventory Item</th>
                      <th className="px-3 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {articles.map((art, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-medium">
                          {art.article}
                          <div className="text-xs text-muted-foreground font-mono">
                            Unit: {art.unit}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="1"
                            value={art.quantity}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setArticles(
                                articles.map((a, i) => (i === idx ? { ...a, quantity: val } : a))
                              );
                            }}
                            className="h-8 w-20"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={art.price}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setArticles(
                                articles.map((a, i) => (i === idx ? { ...a, price: val } : a))
                              );
                            }}
                            className="h-8 w-24 font-mono"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={art.selectedCombinationId || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setArticles(
                                articles.map((a, i) =>
                                  i === idx ? { ...a, selectedCombinationId: val || undefined } : a
                                )
                              );
                            }}
                            className="w-full h-8 rounded border bg-transparent px-2 text-xs"
                          >
                            <option value="">-- Select matching product --</option>
                            {art.suggestedProducts?.flatMap((p: any) =>
                              (p.combinations || []).map((c: any) => (
                                <option key={c.id} value={c.id}>
                                  {c.name || p.name} ({c.unit}) - ₱{Number(c.price || 0).toFixed(2)} [Stock: {c.inventory?.quantity ?? 0}]
                                </option>
                              ))
                            )}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeItem(idx)}
                            className="text-rose-600 hover:text-rose-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {articles.length > 0 && (
            <Button
              onClick={handleApply}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <CheckCircle2 className="h-4 w-4" /> Apply to Order
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
