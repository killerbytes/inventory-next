"use client";

import DraftAutoSaver from "@/components/common/DraftAutoSaver";
import Modal from "@/components/common/Modal";
import PendingOrderForm from "@/components/forms/PendingOrderForm";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { clearDraft, DRAFT_STORAGE_KEYS, loadDraft } from "@/lib/draftStorage";
import { SupplierData } from "@/schemas";
import {
  GoodReceiptFormSchema,
  GoodReceiptModalForm,
} from "@/schemas/goodReceipt.schema";
import {
  createGoodReceiptAction,
  updateGoodReceiptAction,
} from "@/server/actions/goodReceipt.actions";
import { useUIStore } from "@/stores/uiStore";
import { goodReceiptItemDefault, ORDER_STATUS } from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const goodReceiptDefault: GoodReceiptModalForm = {
  referenceNo: "",
  receiptDate: new Date(),
  goodReceiptLines: [goodReceiptItemDefault],
  supplierId: 0,
  internalNotes: "",
};

function GoodReceiptModalContent({
  suppliers = [],
}: {
  suppliers: SupplierData[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { setGoodReceiptModalOpen, editingGoodReceipt } = useUIStore();
  const isEdit = Boolean(editingGoodReceipt?.id);

  const form = useForm<GoodReceiptModalForm>({
    resolver: zodResolver(GoodReceiptFormSchema),
    defaultValues: goodReceiptDefault,
  });

  useEffect(() => {
    if (editingGoodReceipt) {
      form.reset({
        referenceNo: editingGoodReceipt.referenceNo || "",
        receiptDate: editingGoodReceipt.receiptDate
          ? new Date(editingGoodReceipt.receiptDate)
          : new Date(),
        supplierId:
          editingGoodReceipt.supplierId ||
          (editingGoodReceipt.supplier as any)?.id ||
          0,
        internalNotes: editingGoodReceipt.internalNotes || "",
        goodReceiptLines:
          editingGoodReceipt.goodReceiptLines &&
          editingGoodReceipt.goodReceiptLines.length > 0
            ? editingGoodReceipt.goodReceiptLines.map((line: any) => ({
                id: line.id,
                combinationId: line.combinationId,
                quantity: Number(line.quantity || 1),
                purchasePrice: Number(line.purchasePrice || 0),
                discount: Number(line.discount || 0),
                discountNote: line.discountNote || "",
                combination: line.combination || null,
              }))
            : [goodReceiptItemDefault],
      });
    } else {
      try {
        const stored = loadDraft<GoodReceiptModalForm>(
          DRAFT_STORAGE_KEYS.PURCHASE,
          ["receiptDate"],
        );
        if (stored) {
          form.reset(stored);
        } else {
          form.reset(goodReceiptDefault);
        }
      } catch {
        form.reset(goodReceiptDefault);
      }
    }
  }, [editingGoodReceipt, form]);

  async function onSubmit(values: GoodReceiptModalForm) {
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          ...(isEdit && { status: ORDER_STATUS.RECEIVED }),
          goodReceiptLines: values.goodReceiptLines.map(
            ({ combination, ...rest }) => rest,
          ),
        };

        if (isEdit && editingGoodReceipt?.id) {
          await updateGoodReceiptAction(Number(editingGoodReceipt.id), payload);
          toast.success("Good Receipt updated successfully");
        } else {
          await createGoodReceiptAction(payload);
          toast.success("Purchase Order created successfully");
          clearDraft(DRAFT_STORAGE_KEYS.PURCHASE);
        }

        setGoodReceiptModalOpen(false);
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || "Failed to save good receipt.");
      }
    });
  }

  const handleSaveDraft = async (values: GoodReceiptModalForm) => {
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          status: ORDER_STATUS.DRAFT,
          goodReceiptLines: values.goodReceiptLines.map(
            ({ combination, ...rest }) => rest,
          ),
        };

        await updateGoodReceiptAction(Number(editingGoodReceipt?.id), payload);
        toast.success("Draft saved successfully!");
        setGoodReceiptModalOpen(false);
        router.refresh();
      } catch (error: any) {
        toast.error(error?.message || "Failed to save draft.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {!isEdit && (
        <DraftAutoSaver
          form={form as any}
          storageKey={DRAFT_STORAGE_KEYS.PURCHASE}
        />
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <PendingOrderForm form={form as any} suppliers={suppliers} />

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-center pt-4 border-t gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setGoodReceiptModalOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={form.handleSubmit(handleSaveDraft)}
                disabled={isPending}
              >
                Save Draft
              </Button>
            )}
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
              type="submit"
              disabled={isPending}
            >
              <Save className="h-4 w-4 mr-1" />
              {isPending
                ? isEdit
                  ? "Receiving Order..."
                  : "Creating Order..."
                : isEdit
                  ? "Receive Order"
                  : "Create Order"}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </div>
  );
}

export default function GoodReceiptModal({
  suppliers = [],
}: {
  suppliers?: SupplierData[];
}) {
  const {
    isGoodReceiptModalOpen,
    setGoodReceiptModalOpen,
    editingGoodReceipt,
  } = useUIStore();

  if (!isGoodReceiptModalOpen) return null;

  const isEdit = Boolean(editingGoodReceipt?.id);
  const title = isEdit
    ? `Edit Good Receipt ${editingGoodReceipt?.referenceNo ? `(${editingGoodReceipt.referenceNo})` : `#${editingGoodReceipt?.id}`}`
    : "Create Good Receipt";
  const description = isEdit
    ? "Modify draft good receipt lines, quantities, and supplier order details."
    : "Receive supplier shipments and purchase orders.";

  return (
    <Modal
      title={title}
      description={description}
      isOpen={isGoodReceiptModalOpen}
      onClose={() => setGoodReceiptModalOpen(false)}
      size="lg"
    >
      <GoodReceiptModalContent suppliers={suppliers} />
    </Modal>
  );
}
