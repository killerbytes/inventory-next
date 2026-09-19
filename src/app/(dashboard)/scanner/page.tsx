"use client";

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
import { Input } from "@/components/ui/input";
import { lookupBarcodeAction } from "@/server/actions/product.actions";
import { ScanBarcode, Search } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

let audioCtx: AudioContext | null = null;

const playBeep = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn("AudioContext error", e);
  }
};

export default function BarcodeScannerPage() {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScanOrSubmit = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLoading(true);
    try {
      const result = await lookupBarcodeAction(trimmed);
      if (result) {
        playBeep();
        setProduct(result);
        toast.success(`Found: ${result.name || result.sku}`);
      } else {
        setProduct(null);
        toast.error(`No product found for barcode "${trimmed}"`);
      }
    } catch {
      toast.error("Lookup failed");
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScanOrSubmit(barcode);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Barcode Scanner"
        description="Scan product barcodes or enter numbers manually to lookup real-time inventory and pricing."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5 text-primary" /> Scan or Enter
            Barcode
          </CardTitle>
          <CardDescription>
            Point your physical laser/USB barcode scanner here, or type the code
            and press Enter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan barcode (e.g. 123456789)..."
                className="pl-9 h-11 text-base font-mono"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={() => handleScanOrSubmit(barcode)}
              disabled={isLoading || !barcode.trim()}
              className="h-11 px-6 bg-primary"
            >
              {isLoading ? "Searching..." : "Lookup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {product && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <div className="flex justify-between items-start">
              <div>
                <Badge className="mb-2">MATCH FOUND</Badge>
                <CardTitle className="text-2xl font-bold">
                  {product.name || product.product?.name}
                </CardTitle>
                <CardDescription className="font-mono">
                  SKU: {product.sku} | Barcode: {product.barcode || "N/A"}
                </CardDescription>
              </div>
              <Link
                href={`/products/${product.productId || product.product?.id}`}
              >
                <Button variant="outline" size="sm">
                  View Full Product
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted/40 rounded-lg">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Unit & Category
              </span>
              <p className="font-semibold text-base mt-1">
                {product.unit || "PCS"} ·{" "}
                {product.product?.category?.name || "General"}
              </p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Current Price
              </span>
              <p className="font-mono font-bold text-xl text-emerald-600 mt-1">
                ₱{Number(product.price || 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Stock on Hand
              </span>
              <p className="font-mono font-bold text-xl text-primary mt-1">
                {product.inventory?.quantity ?? 0} {product.unit || "units"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
