"use client";

import React from "react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";

interface BarcodeGeneratorProps {
  value: string;
  format?: "barcode" | "qrcode" | "both";
  height?: number;
  width?: number;
}

export default function BarcodeGenerator({
  value,
  format = "both",
  height = 40,
  width = 1.5,
}: BarcodeGeneratorProps) {
  if (!value) return null;

  return (
    <div className="flex items-center gap-6 p-4 rounded-xl bg-white dark:bg-zinc-900 border shadow-xs">
      {(format === "barcode" || format === "both") && (
        <div className="flex flex-col items-center">
          <Barcode value={value} height={height} width={width} fontSize={12} margin={0} />
        </div>
      )}

      {(format === "qrcode" || format === "both") && (
        <div className="flex flex-col items-center gap-1">
          <QRCodeSVG value={value} size={64} />
          <span className="text-[10px] font-mono text-muted-foreground">QR CODE</span>
        </div>
      )}
    </div>
  );
}
