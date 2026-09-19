"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { ProductCombinationData } from "@/schemas";
import { useUIStore } from "@/stores/uiStore";
import { Printer } from "lucide-react";
import { useRef, useState } from "react";
import Barcode from "react-barcode";
import Modal from "../common/Modal";

function BarcodePrinterModalContent({
  combinations,
}: {
  combinations: ProductCombinationData[];
}) {
  const { setBarcodePrinterModalOpen } = useUIStore();

  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(combinations.map((i) => i.id)),
  );
  const printRef = useRef<HTMLDivElement>(null);

  const toggleSelectAll = () => {
    if (selectedIds.size === combinations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(combinations.map((i) => i.id)));
    }
  };

  const toggleItem = (id: string | number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handlePrint = () => {
    window.print();
  };

  const printItems = combinations.filter((i) => selectedIds.has(i.id));

  return (
    <>
      <div className="space-y-4 my-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-sm font-medium text-muted-foreground">
            Selected: {selectedIds.size} of {combinations.length} items
          </span>
          <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
            {selectedIds.size === combinations.length
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>

        <div className="border rounded-lg max-h-64 overflow-y-auto divide-y">
          {combinations.map((item) => {
            const isChecked = selectedIds.has(item.id);
            const barcodeValue = item.barcode;

            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className="flex items-center justify-between p-3 hover:bg-muted/40 cursor-pointer text-sm"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleItem(item.id)}
                    className="rounded border-gray-300"
                  />
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      SKU: {item.sku || "N/A"} | Code: {barcodeValue}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.unit || "PCS"}</Badge>
                  <span className="font-mono font-bold">
                    ₱{Number(item.price || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Printable Barcode Label Area */}
        <div className="border rounded-xl p-4 bg-muted/20">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Print Preview ({printItems.length} labels)
          </h4>

          <div
            ref={printRef}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2"
          >
            {printItems.map((item) => {
              const barcodeValue = item.barcode || item.sku || String(item.id);

              return (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 bg-white text-black flex flex-col items-center justify-center text-center shadow-xs page-break"
                >
                  <div className="font-bold text-xs truncate max-w-full">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-gray-600 mb-1">
                    {item.unit || "PCS"} · ₱{Number(item.price || 0).toFixed(2)}
                  </div>
                  <Barcode
                    value={barcodeValue}
                    width={1.2}
                    height={35}
                    fontSize={11}
                    margin={2}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={() => setBarcodePrinterModalOpen(false)}
        >
          Close
        </Button>
        <Button
          onClick={handlePrint}
          disabled={printItems.length === 0}
          className="bg-primary text-white gap-2"
        >
          <Printer className="h-4 w-4" /> Print Labels
        </Button>
      </DialogFooter>
    </>
  );
}

export default function BarcodePrinterModal({
  combinations,
}: {
  combinations: ProductCombinationData[];
}) {
  const { isBarcodePrinterModalOpen, setBarcodePrinterModalOpen } =
    useUIStore();

  if (!isBarcodePrinterModalOpen) return null;

  return (
    <Modal
      title={
        <>
          <Printer className="h-5 w-5 text-primary" />
          Barcode Label Printer
        </>
      }
      description="Generate and print physical Code-128 barcode inventory shelf labels."
      isOpen={isBarcodePrinterModalOpen}
      onClose={() => setBarcodePrinterModalOpen(false)}
    >
      <BarcodePrinterModalContent combinations={combinations} />
    </Modal>
  );
}
