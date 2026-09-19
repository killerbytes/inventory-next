"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { StockAdjustmentInput, stockAdjustmentInputSchema } from "@/schemas";
import { createStockAdjustmentAction } from "@/server/actions/inventory.actions";
import { useUIStore } from "@/stores/uiStore";
import {
  STOCK_ADJUSTMENT_TYPE,
  STOCK_ADJUSTMENT_TYPE_OPTIONS,
} from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Modal from "../common/Modal";
import FormField from "../forms/FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

function StockAdjustmentModalContent() {
  const { setStockAdjustmentModalOpen, editingCombination } = useUIStore();
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(stockAdjustmentInputSchema),
    defaultValues: {
      combinationId: editingCombination?.id,
      reason: STOCK_ADJUSTMENT_TYPE.DAMAGED,
      newQuantity: 1,
      notes: "",
    },
  });

  const handleSubmit = async (values: StockAdjustmentInput) => {
    startTransition(async () => {
      try {
        await createStockAdjustmentAction(values);
        toast.success(
          `Stock adjustment recorded for ${editingCombination?.name}!`,
        );
        setStockAdjustmentModalOpen(false, null);
        form.reset();
      } catch (error: any) {
        toast.error(error.message || "Failed to record stock adjustment.");
      }
    });
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="font-semibold">{editingCombination?.name}</div>

        <FormField
          form={form}
          name="reason"
          label="Adjustment Type"
          render={({ field }) => (
            <Select {...field} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_ADJUSTMENT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FormField form={form} name="newQuantity" label="Quantity" />
        <FormField
          form={form}
          name="notes"
          label="Notes"
          render={({ field }) => <Textarea {...field} />}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setStockAdjustmentModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isPending ? "Saving..." : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export default function StockAdjustmentModal() {
  const { isStockAdjustmentModalOpen, setStockAdjustmentModalOpen } =
    useUIStore();

  if (!isStockAdjustmentModalOpen) return null;

  return (
    <Modal
      title="Stock Adjustment"
      description="Record stock adjustments for damaged, lost, expired, or found items."
      isOpen={isStockAdjustmentModalOpen}
      onClose={() => setStockAdjustmentModalOpen(false)}
    >
      <StockAdjustmentModalContent />
    </Modal>
  );
}
