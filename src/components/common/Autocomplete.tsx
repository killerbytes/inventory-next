"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import React from "react";

export interface AutocompleteOption {
  id?: number | string;
  name: string;
}

interface AutocompleteProps {
  value: string | undefined;
  onChange: (item: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
}

export default function Autocomplete({
  value,
  onChange,
  options = [],
  placeholder = "Type to search...",
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);

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
            {value}
            <ChevronsUpDown className="opacity-50 h-4 w-4" />
          </Button>
        }
      ></PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((item) => (
                <CommandItem
                  value={String(item.name)}
                  key={item.id ?? item.name}
                  onSelect={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  {item.name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      item.name === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem>
                <Plus className="h-4 w-4 mr-1" />
                <span>Add New</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
