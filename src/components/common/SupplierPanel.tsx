"use client";

import React from "react";
import Link from "next/link";

export interface SupplierPanelData {
  id: number;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
}

export default function SupplierPanel({
  supplier,
}: {
  supplier: SupplierPanelData | undefined;
}) {
  if (!supplier) return null;

  return (
    <div className="p-3 border rounded-xl bg-card shadow-sm flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold">
          <Link
            href={`/suppliers?id=${supplier.id}`}
            className="text-primary hover:underline"
          >
            {supplier.name}
          </Link>
        </h3>
        {supplier.contact && (
          <p className="text-xs text-muted-foreground">Contact: {supplier.contact}</p>
        )}
      </div>
      {supplier.phone && (
        <span className="text-xs font-mono px-2 py-1 bg-muted rounded-md">{supplier.phone}</span>
      )}
    </div>
  );
}
