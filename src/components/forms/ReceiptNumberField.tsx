"use client";

import { isBookletCodeOnly } from "@/lib/receiptNumber";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SalesOrderForm } from "@/schemas";
import { checkReceiptNumberAction } from "@/server/actions/salesOrder.actions";
import { ReceiptNumberCheck } from "@/types";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import FormField from "./FormField";

interface Props {
  form: UseFormReturn<SalesOrderForm>;
  /** The saved draft being edited, which must not conflict with its own number. */
  excludeId?: number;
}

/**
 * Receipt number input that warns on blur, before the items are encoded, when the
 * number is already used, and offers the number with the next booklet code.
 */
export default function ReceiptNumberField({ form, excludeId }: Props) {
  const [conflict, setConflict] = useState<ReceiptNumberCheck | null>(null);

  const currentNumber = () => form.getValues("salesOrderNumber")?.trim() ?? "";

  const checkNumber = async () => {
    const receiptNumber = currentNumber();
    if (!receiptNumber || isBookletCodeOnly(receiptNumber)) return;

    try {
      const res = await checkReceiptNumberAction({ receiptNumber, excludeId });
      // The number may have been changed while the check was running.
      if (receiptNumber !== currentNumber()) return;
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setConflict(res.data.existing ? res.data : null);
    } catch {
      toast.error("Failed to check the receipt number.");
    }
  };

  const applySuggestion = (suggestion: string) => {
    setConflict(null);
    form.setValue("salesOrderNumber", suggestion, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setFocus("salesOrderNumber");
  };

  return (
    <FormField
      form={form}
      name="salesOrderNumber"
      label="Receipt No"
      render={({ field, fieldState }) => (
        <>
          <Input
            {...field}
            value={field.value ?? ""}
            aria-invalid={fieldState.invalid || Boolean(conflict)}
            onChange={(e) => {
              setConflict(null);
              field.onChange(e);
            }}
            onBlur={() => {
              field.onBlur();
              checkNumber();
            }}
          />
          {conflict?.existing && (
            <div role="alert" className="space-y-1 text-xs text-rose-600">
              <p>
                Receipt No {field.value?.trim()} is already used:{" "}
                {[
                  formatDate(conflict.existing.orderDate),
                  conflict.existing.customerName,
                  formatCurrency(conflict.existing.totalAmount),
                ]
                  .filter(Boolean)
                  .join(", ")}
                .
              </p>
              {conflict.suggestion && (
                <p className="flex flex-wrap items-center gap-1">
                  New booklet?
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => applySuggestion(conflict.suggestion!)}
                  >
                    Use {conflict.suggestion}
                  </Button>
                </p>
              )}
            </div>
          )}
        </>
      )}
    />
  );
}
