"use client";

import useDebounce from "@/hooks/useDebounce";
import { ROUTES } from "@/lib/routes";
import { SupplierData } from "@/schemas";
import {
  GoodReceiptInput,
  GoodReceiptInputSchema,
} from "@/schemas/goodReceipt.schema";
import { createGoodReceiptAction } from "@/server/actions/goodReceipt.actions";
import { goodReceiptItemDefault } from "@/types/definitions";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm, UseFormReturn, useWatch } from "react-hook-form";
import { toast } from "sonner";
import PendingOrderForm from "../forms/PendingOrderForm";
import PageHeader from "../layout/PageHeader";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const DRAFT_STORAGE_KEY = "INVENTORY_PURCHASE_DRAFT";

/**
 * Headless draft autosave component.
 * Subscribes to useWatch to capture both field changes and useFieldArray mutations (remove/append).
 * Encapsulating useWatch here ensures the parent widget, child form, and table rows NEVER re-render on keystroke.
 */
function DraftAutoSaver({ form }: { form: UseFormReturn<GoodReceiptInput> }) {
  const formData = useWatch({ control: form.control });
  const debouncedFormData = useDebounce(formData, 1000);

  useEffect(() => {
    if (!form.formState.isDirty) return;
    if (typeof window === "undefined") return;

    try {
      const serialized = JSON.stringify(form.getValues(), (_, v) =>
        v === undefined ? null : v,
      );
      const currentStored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (currentStored !== serialized) {
        localStorage.setItem(DRAFT_STORAGE_KEY, serialized);
      }
    } catch {
      // ignore draft saving errors
    }
  }, [debouncedFormData, form]);

  return null;
}

const goodReceiptDefault: GoodReceiptInput = {
  referenceNo: "",
  receiptDate: new Date(),
  // goodReceiptLines: Array.from({ length: 3 }, () => ({
  //   ...goodReceiptItemDefault,
  // })),
  goodReceiptLines: [goodReceiptItemDefault],
  supplierId: 0,
  internalNotes: "",
};

interface CreateGoodReceiptClientWidgetProps {
  initialSuppliers?: SupplierData[];
}

export default function CreateGoodReceiptClientWidget({
  initialSuppliers = [],
}: CreateGoodReceiptClientWidgetProps) {
  const router = useRouter();
  const [json, setJson] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<GoodReceiptInput>({
    resolver: zodResolver(GoodReceiptInputSchema),
    values: goodReceiptDefault,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (stored) {
        const defaultValues = JSON.parse(stored);
        form.reset(defaultValues);
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
  useEffect(() => {
    if (json) {
      try {
        const data = JSON.parse(json);
        if (Array.isArray(data)) {
          form.setValue(
            "goodReceiptLines",
            data.map((item: any) => ({
              combinationId: Number(item.combinationId || item.id || -1),
              quantity: Number(item.quantity || item.qty || 1),
              purchasePrice: Number(item.price || item.purchasePrice || 0),
              discount: Number(item.discount || 0),
              discountNote: item.discountNote || "",
            })),
          );
          setJson(null);
          toast.success(`Imported ${data.length} items from JSON`);
        }
      } catch {
        toast.error("Failed to parse JSON. Please enter a valid JSON array.");
      }
    }
  }, [form.setValue, json]);

  async function onSubmit(values: GoodReceiptInput) {
    // Filter out rows that are entirely unselected/blank if multiple were pre-generated
    const validLines = (values.goodReceiptLines || []).filter(
      (line) => line.combinationId && Number(line.combinationId) > 0,
    );

    if (validLines.length === 0) {
      toast.error("Please add at least one product line item.");
      return;
    }

    startTransition(async () => {
      try {
        await createGoodReceiptAction(values);

        toast.success("Purchase Order created successfully");
        if (typeof window !== "undefined") {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
        router.push(ROUTES.GOOD_RECEIPT);
      } catch (error: any) {
        toast.error(error?.message || "Failed to create good receipt.");
      }
    });
  }
  console.log(form.formState.errors, form.getValues());

  return (
    <div className="space-y-6">
      <PageHeader title="Create Good Receipt">
        <div className="flex items-center gap-3">
          <Input
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setJson(e.currentTarget.value);
              }
            }}
            placeholder="Paste JSON here..."
            className="w-64 h-9 text-xs"
          />
        </div>
      </PageHeader>

      <DraftAutoSaver form={form} />
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
      </form>
    </div>
  );
}
