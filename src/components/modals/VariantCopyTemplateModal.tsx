"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { createVariantTypeAction } from "@/server/actions/variantType.actions";

export interface VariantTypeData {
  id?: number;
  name: string;
  values: Array<{ id?: number; value: string }>;
}

export default function VariantCopyTemplateModal({
  selected,
  isOpen,
  onClose,
  onSave,
}: {
  selected?: VariantTypeData;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (name: string, selected: VariantTypeData) => Promise<void> | void;
}) {
  const [templateName, setTemplateName] = useState(selected?.name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error("Please specify template name");
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSave && selected) {
        await onSave(templateName, selected);
      } else if (selected) {
        await createVariantTypeAction({
          name: templateName.trim(),
          values: (selected.values || []).map((v) => ({ value: v.value })),
        });
      }
      toast.success(`Variant template "${templateName}" saved successfully!`);
      onClose();
    } catch {
      toast.error("Failed to save variant template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save to Variant Template</DialogTitle>
          <DialogDescription>
            Save these option values as a reusable variant template for future products.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-1.5 p-2.5 bg-muted/40 rounded-lg">
            {selected?.values?.map((v, i) => (
              <Badge key={v.id || i} variant="secondary">
                {v.value}
              </Badge>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              placeholder="e.g. Standard Rebar Sizes"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
