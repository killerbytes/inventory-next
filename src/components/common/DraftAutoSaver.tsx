"use client";

import useDebounce from "@/hooks/useDebounce";
import { saveDraft } from "@/lib/draftStorage";
import { useEffect } from "react";
import { FieldValues, UseFormReturn, useWatch } from "react-hook-form";

export interface DraftAutoSaverProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  storageKey: string;
  debounceMs?: number;
}

/**
 * Headless draft autosave component.
 *
 * @remarks
 * Subscribes to react-hook-form changes via `useWatch` and debounces persistence to localStorage.
 * Encapsulating `useWatch` inside this headless component prevents the parent page, modal, form,
 * and any complex table rows from re-rendering on every keystroke.
 */
export default function DraftAutoSaver<T extends FieldValues>({
  form,
  storageKey,
  debounceMs = 1000,
}: DraftAutoSaverProps<T>) {
  const formData = useWatch({ control: form.control });
  const debouncedFormData = useDebounce(formData, debounceMs);

  useEffect(() => {
    if (!form.formState.isDirty) return;
    saveDraft(storageKey, form.getValues());
  }, [debouncedFormData, form, storageKey]);

  return null;
}
