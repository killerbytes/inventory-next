"use client";

import DraftAutoSaver from "@/components/common/DraftAutoSaver";
import {
  clearDraft,
  DRAFT_STORAGE_KEYS,
  loadDraft,
  saveDraft,
} from "@/lib/draftStorage";
import { ROUTES } from "@/lib/routes";
import { ProductCombinationSchema, SupplierData } from "@/schemas";
import {
  GoodReceiptInputSchema,
  GoodReceiptLineInputSchema,
} from "@/schemas/goodReceipt.schema";
import { createGoodReceiptAction } from "@/server/actions/goodReceipt.actions";
import { goodReceiptItemDefault } from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import PendingOrderForm from "../forms/PendingOrderForm";
import PageHeader from "../layout/PageHeader";
import { Button } from "../ui/button";

const goodReceiptDefault: GoodReceiptForm = {
  referenceNo: "",
  receiptDate: new Date(),
  goodReceiptLines: [goodReceiptItemDefault],
  supplierId: 0,
  internalNotes: "",
};

interface CreateGoodReceiptClientWidgetProps {
  initialSuppliers?: SupplierData[];
}

const GoodReceiptLineWithCombination = GoodReceiptLineInputSchema.extend({
  combination: ProductCombinationSchema.nullable(),
});

const GoodReceiptFormSchema = GoodReceiptInputSchema.extend({
  goodReceiptLines: z.array(GoodReceiptLineWithCombination),
});
export type GoodReceiptForm = z.infer<typeof GoodReceiptFormSchema>;
export type GoodReceiptLineWithCombination = z.infer<
  typeof GoodReceiptLineWithCombination
>;

export default function CreateGoodReceiptClientWidget({
  initialSuppliers = [],
}: CreateGoodReceiptClientWidgetProps) {
  const router = useRouter();
  const [json, setJson] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<GoodReceiptForm>({
    resolver: zodResolver(GoodReceiptFormSchema),
    values: goodReceiptDefault,
  });

  useEffect(() => {
    try {
      const stored = loadDraft<GoodReceiptForm>(DRAFT_STORAGE_KEYS.PURCHASE, [
        "receiptDate",
      ]);
      if (stored) {
        form.reset(stored);
      }
    } catch {
      toast.error("Failed to load draft.");
    }
  }, [form.reset]);

  useEffect(() => {
    const timer = setTimeout(() => {
      form.setFocus("supplierId");
    }, 50);
    return () => clearTimeout(timer);
  }, [form.setFocus]);

  // Handle bulk JSON paste import
  // useEffect(() => {
  //   if (json) {
  //     try {
  //       const data = JSON.parse(json);
  //       if (Array.isArray(data)) {
  //         form.setValue(
  //           "goodReceiptLines",
  //           data.map((item: any) => ({
  //             combinationId: Number(item.combinationId || item.id || -1),
  //             quantity: Number(item.quantity || item.qty || 1),
  //             purchasePrice: Number(item.price || item.purchasePrice || 0),
  //             discount: Number(item.discount || 0),
  //             discountNote: item.discountNote || "",
  //           })),
  //         );
  //         setJson(null);
  //         toast.success(`Imported ${data.length} items from JSON`);
  //       }
  //     } catch {
  //       toast.error("Failed to parse JSON. Please enter a valid JSON array.");
  //     }
  //   }
  // }, [form.setValue, json]);

  async function onSubmit(values: GoodReceiptForm) {
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          goodReceiptLines: values.goodReceiptLines.map(
            ({ combination, ...rest }) => rest,
          ),
        };

        await createGoodReceiptAction(payload);

        toast.success("Purchase Order created successfully");
        clearDraft(DRAFT_STORAGE_KEYS.PURCHASE);
        router.push(ROUTES.GOOD_RECEIPT);
      } catch (error: any) {
        toast.error(error?.message || "Failed to create good receipt.");
      }
    });
  }

  const handleSaveDraft = () => {
    try {
      saveDraft(DRAFT_STORAGE_KEYS.PURCHASE, form.getValues());
      toast.success("Draft saved successfully!");
    } catch {
      toast.error("Failed to save draft.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Create Good Receipt">
        {/* <div className="flex items-center gap-3">
          <Input
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setJson(e.currentTarget.value);
              }
            }}
            placeholder="Paste JSON here..."
            className="w-64 h-9 text-xs"
          />
        </div> */}
      </PageHeader>

      <DraftAutoSaver form={form} storageKey={DRAFT_STORAGE_KEYS.PURCHASE} />
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4">
          <PendingOrderForm form={form} suppliers={initialSuppliers} />

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
              className="gap-2"
            >
              <ArrowLeft /> Back
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isPending}
              >
                Save Draft
              </Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                type="submit"
                disabled={isPending}
              >
                <Save />
                {isPending ? "Creating Order..." : "Create Order"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
