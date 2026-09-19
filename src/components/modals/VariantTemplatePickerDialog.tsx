"use client";

import React, { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

export interface VariantTypeTemplate {
  id: number;
  name: string;
  values: Array<{ id?: number; value: string }>;
}

export default function VariantTemplatePickerDialog({
  isOpen,
  onSelect,
  onClose,
  templates = [],
}: {
  isOpen: boolean;
  onSelect: (variantType: VariantTypeTemplate) => void;
  onClose: () => void;
  templates?: VariantTypeTemplate[];
}) {
  return (
    <CommandDialog open={isOpen} onOpenChange={onClose}>
      <CommandInput placeholder="Search variant template..." />
      <CommandList>
        <CommandEmpty>No variant templates found.</CommandEmpty>
        <CommandGroup heading="Variant Templates">
          {templates.map((variantType) => (
            <CommandItem
              key={variantType.id}
              onSelect={() => {
                onSelect(variantType);
                onClose();
              }}
              className="flex justify-between items-center py-2"
            >
              <span className="font-semibold">{variantType.name}</span>
              <div className="flex gap-1 flex-wrap">
                {variantType.values.map((v, i) => (
                  <Badge key={v.id || i} variant="outline" className="text-xs">
                    {v.value}
                  </Badge>
                ))}
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
