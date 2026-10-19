"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import Modal from "@/components/common/Modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UNIT_COLOR } from "@/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  getPriceHistoryAction,
  updateCombinationPriceAction,
} from "@/server/actions/product.actions";
import { useUIStore } from "@/stores/uiStore";
import { createColumnHelper } from "@tanstack/react-table";
import { cx } from "class-variance-authority";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Check,
  History,
  Layers,
  Loader2,
  Percent,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

const columnHelper = createColumnHelper<any>();

function PriceManagerModalContent() {
  const { editingPriceCombination, setPriceModalOpen } = useUIStore();
  const router = useRouter();

  const [currentSrp, setCurrentSrp] = useState<number>(() => {
    return Number(editingPriceCombination?.price || 0);
  });
  const [newSrpInput, setNewSrpInput] = useState<string>(() => {
    const p = Number(editingPriceCombination?.price || 0);
    return p > 0 ? String(p) : "";
  });
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);
  const [isUpdating, startTransition] = useTransition();

  const combinationId = editingPriceCombination?.id;
  const comboName = editingPriceCombination?.name || "Product Combination";
  const unit = editingPriceCombination?.unit || "PCS";
  const conversionFactor = Number(editingPriceCombination?.conversionFactor || 1);

  const averagePrice = Number(
    (editingPriceCombination as any)?.inventory?.averagePrice ??
    (editingPriceCombination as any)?.averagePrice ??
    0,
  );

  const fetchHistory = useCallback(async () => {
    if (!combinationId) return;
    setIsLoadingHistory(true);
    try {
      const res = await getPriceHistoryAction({ combinationId });
      setHistoryLogs(res?.data || []);
    } catch (err: any) {
      console.error("Failed to load price history:", err);
      toast.error("Failed to load price history logs.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [combinationId]);

  useEffect(() => {
    if (combinationId) {
      setCurrentSrp(Number(editingPriceCombination?.price || 0));
      setNewSrpInput(
        Number(editingPriceCombination?.price || 0) > 0
          ? String(editingPriceCombination?.price)
          : "",
      );
      fetchHistory();
    }
  }, [combinationId, editingPriceCombination?.price, fetchHistory]);

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(newSrpInput);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Please enter a valid price greater than 0.");
      return;
    }

    startTransition(async () => {
      try {
        await updateCombinationPriceAction({
          combinationId: Number(combinationId),
          price: parsedPrice,
        });

        toast.success(`SRP updated to ${formatCurrency(parsedPrice)} successfully!`);
        setCurrentSrp(parsedPrice);
        router.refresh();
        await fetchHistory();
      } catch (err: any) {
        toast.error(err.message || "Failed to update price.");
      }
    });
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("changedAt", {
        header: "Date & Time",
        cell: ({ row }) => {
          const raw = row.original.changedAt || row.original.createdAt;
          return (
            <div className=" text-muted-foreground whitespace-nowrap">
              {raw ? formatDateTime(raw) : "—"}
            </div>
          );
        },
      }),
      columnHelper.accessor("fromPrice", {
        header: () => <div className="text-right">Previous SRP</div>,
        cell: ({ row }) => (
          <div className="text-right text-muted-foreground line-through ">
            {formatCurrency(Number(row.original.fromPrice || 0))}
          </div>
        ),
      }),
      columnHelper.accessor("toPrice", {
        header: () => <div className="text-right">New SRP</div>,
        cell: ({ row }) => {
          const toP = Number(row.original.toPrice || 0);
          const fromP = Number(row.original.fromPrice || 0);
          const isUp = toP > fromP;
          const isDown = toP < fromP;
          return (
            <div
              className={cx(
                "text-right font-semibold ",
                isUp && "text-emerald-600 dark:text-emerald-400",
                isDown && "text-rose-600 dark:text-rose-400",
              )}
            >
              {formatCurrency(toP)}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "variance",
        header: () => <div className="text-right">Variance</div>,
        cell: ({ row }) => {
          const toP = Number(row.original.toPrice || 0);
          const fromP = Number(row.original.fromPrice || 0);
          const diff = toP - fromP;
          if (fromP === 0 || diff === 0) return <div className="text-right  text-muted-foreground">—</div>;

          const isPositive = diff > 0;
          return (
            <div
              className={cx(
                "text-right  font-medium flex items-center justify-end gap-0.5",
                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {isPositive ? "+" : ""}
              {formatCurrency(diff)}
            </div>
          );
        },
      }),
      columnHelper.accessor("user.username", {
        id: "modifiedBy",
        header: "Changed By",
        cell: ({ row }) => (
          <div className=" truncate max-w-[120px]">
            {row.original.user?.name || row.original.user?.username || "System"}
          </div>
        ),
      }),
    ],
    [],
  );

  const profitDiff = currentSrp - averagePrice;
  const marginPercent =
    currentSrp > 0 && averagePrice > 0
      ? ((currentSrp - averagePrice) / currentSrp) * 100
      : null;

  return (
    <div className="space-y-5">
      {/* Product metadata banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ColorBadge colorMap={UNIT_COLOR}>{unit}</ColorBadge>
            <span className="font-semibold text-sm sm:text-base">{comboName}</span>
          </div>
          <div className=" text-muted-foreground flex items-center gap-3">
            <span>Factor: <strong>{conversionFactor}</strong></span>
            {editingPriceCombination?.sku && (
              <span>SKU: <strong>{editingPriceCombination.sku}</strong></span>
            )}
            {editingPriceCombination?.barcode && (
              <span>Barcode: <strong>{editingPriceCombination.barcode}</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards: Current SRP, Average Price, Margin */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3 bg-muted/40 border">
          <div className=" text-muted-foreground font-medium flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-primary" />
            Current SRP
          </div>
          <div className="text-lg font-bold text-foreground mt-1">
            {formatCurrency(currentSrp)}
          </div>
        </Card>

        <Card className="p-3 bg-muted/40 border">
          <div className=" text-muted-foreground font-medium flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            Current Average Price
          </div>
          <div className="text-lg font-bold text-foreground mt-1">
            {formatCurrency(averagePrice)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Moving average inventory cost
          </div>
        </Card>

        <Card className="p-3 bg-muted/40 border">
          <div className=" text-muted-foreground font-medium flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5 text-emerald-500" />
            Estimated Margin
          </div>
          <div
            className={cx(
              "text-lg font-bold mt-1",
              profitDiff >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {marginPercent !== null
              ? `${marginPercent.toFixed(1)}%`
              : profitDiff !== 0
                ? formatCurrency(profitDiff)
                : "—"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Spread: {formatCurrency(profitDiff)}
          </div>
        </Card>
      </div>

      {/* Update SRP Form */}
      <form onSubmit={handleUpdatePrice} className="border rounded-lg p-3.5 bg-card/60 space-y-3">
        <div className=" font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          Update Suggested Retail Price (SRP)
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Enter new SRP (e.g. 150.00)"
              value={newSrpInput}
              onChange={(e) => setNewSrpInput(e.target.value)}
              className="text-sm"
              disabled={isUpdating}
            />
          </div>
          <Button
            type="submit"
            disabled={isUpdating}
            className="sm:w-auto w-full gap-1.5 font-medium"
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                Update SRP
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Price History Ledger */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className=" font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <History className="h-3.5 w-3.5 text-primary" />
            Price History Audit Ledger ({historyLogs.length})
          </div>
          {isLoadingHistory && (
            <div className="flex items-center gap-1  text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading history...
            </div>
          )}
        </div>

        <div className="border rounded-md overflow-hidden max-h-60 overflow-y-auto">
          <DataTable
            columns={columns}
            data={historyLogs}
            isLoading={isLoadingHistory}
            emptyMessage="No price history recorded for this combination."
          />
        </div>
      </div>

      <DialogFooter className="pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPriceModalOpen(false, null)}
        >
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function PriceManagerModal() {
  const { isPriceModalOpen, setPriceModalOpen } = useUIStore();

  if (!isPriceModalOpen) return null;

  return (
    <Modal
      title="Combination Price Manager"
      description="Update Suggested Retail Price (SRP) and inspect historical price adjustments."
      isOpen={isPriceModalOpen}
      onClose={() => setPriceModalOpen(false, null)}
      size="md"
    >
      <PriceManagerModalContent />
    </Modal>
  );
}
