"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";
import React from "react";

interface ComboBoxProps {
  setOpen: (open: boolean) => void;
  open: boolean;
  selected: React.ReactNode;
  value: string;
  placeholder?: string;
  children: React.ReactNode;
}

export default function ComboBox({
  setOpen,
  open,
  selected,
  value,
  placeholder = "Type to search...",
  children,
}: ComboBoxProps) {
  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger
        className="w-full"
        render={
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground",
            )}
          >
            {selected ?? (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="opacity-50 h-4 w-4" />
          </Button>
        }
      />
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {children}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
