"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createVariantTypeAction } from "@/server/actions/variantType.actions";
import { toast } from "sonner";

interface VariantTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function VariantTemplateModal({ isOpen, onClose, onSuccess }: VariantTemplateModalProps) {
  const [typeName, setTypeName] = useState("");
  const [valuesInput, setValuesInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) {
      toast.error("Please specify variant type name (e.g. Size, Color)");
      return;
    }

    const values = valuesInput
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((val) => ({ value: val }));

    setIsSubmitting(true);
    try {
      await createVariantTypeAction({
        name: typeName.trim(),
        values,
      });
      toast.success(`Variant template "${typeName}" saved successfully!`);
      setTypeName("");
      setValuesInput("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save variant template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Variant Template</DialogTitle>
          <DialogDescription>
            Define reusable product attribute options (e.g., Size: 10mm, 12mm, 16mm).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="typeName">Variant Type Name</Label>
            <Input
              id="typeName"
              placeholder="e.g. Size, Color, Grade"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valuesInput">Variant Values (Comma separated)</Label>
            <Input
              id="valuesInput"
              placeholder="e.g. 10mm, 12mm, 16mm, 20mm"
              value={valuesInput}
              onChange={(e) => setValuesInput(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary text-white">
              {isSubmitting ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
