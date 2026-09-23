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

interface AutocompleteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  value?: string | null;
  placeholder?: string;
  disabled?: boolean;
}

const AutocompleteContext =
  React.createContext<AutocompleteContextValue | null>(null);

/**
 * Hook to access Autocomplete context state in custom child components.
 */
export function useAutocompleteContext() {
  return React.useContext(AutocompleteContext);
}

export interface AutocompleteValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  value?: string | null;
  placeholder?: string;
  children?: React.ReactNode;
}

/**
 * Value display component for Autocomplete, displaying selected value or placeholder.
 * Similar to SelectValue in Select components.
 */
function AutocompleteValue({
  value,
  placeholder,
  children,
  className,
  ...props
}: AutocompleteValueProps) {
  const context = React.useContext(AutocompleteContext);
  const resolvedValue = children ?? value ?? context?.value;
  const resolvedPlaceholder =
    placeholder ?? context?.placeholder ?? "Select...";
  const isPlaceholder = !resolvedValue;

  return (
    <span
      data-slot="autocomplete-value"
      className={cn(
        "flex flex-1 text-left truncate",
        isPlaceholder && "text-muted-foreground",
        className,
      )}
      {...props}
    >
      {isPlaceholder ? resolvedPlaceholder : resolvedValue}
    </span>
  );
}

export interface AutocompleteProps {
  value?: string | null;
  onChange: (item: AutocompleteOption) => void;
  options?: AutocompleteOption[];
  placeholder?: string;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-invalid"?: boolean | "true" | "false";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  emptyMessage?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  showAddNew?: boolean;
}

/**
 * Autocomplete combobox component supporting compound composition with AutocompleteValue.
 * Follows the pattern of Select/SelectValue for searchable dropdown selection.
 */
function Autocomplete({
  value,
  onChange,
  options = [],
  placeholder = "Type to search...",
  children,
  className,
  disabled = false,
  "aria-invalid": ariaInvalid,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  emptyMessage = "No options found.",
  onAddNew,
  addNewLabel = "Add New",
  showAddNew = false,
}: AutocompleteProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      controlledOnOpenChange?.(nextOpen);
    },
    [isControlled, controlledOnOpenChange],
  );

  const contextValue = React.useMemo(
    () => ({
      open,
      setOpen,
      value,
      placeholder,
      disabled,
    }),
    [open, setOpen, value, placeholder, disabled],
  );

  return (
    <AutocompleteContext.Provider value={contextValue}>
      <Popover open={open} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger
          className="w-full"
          disabled={disabled}
          render={
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-invalid={ariaInvalid}
              disabled={disabled}
            >
              {children ? (
                children
              ) : (
                <AutocompleteValue value={value} placeholder={placeholder} />
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent
          className="p-0 w-[--radix-popover-trigger-width] min-w-[220px]"
          align="start"
        >
          <Command>
            <CommandInput placeholder={placeholder} className="h-9" />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((item) => {
                  const itemKey = item.id ?? item.name;
                  const isSelected =
                    item.name === value ||
                    (value !== undefined &&
                      value !== null &&
                      String(item.id) === String(value));

                  return (
                    <CommandItem
                      key={itemKey}
                      value={String(item.name)}
                      onSelect={() => {
                        onChange(item);
                        setOpen(false);
                      }}
                    >
                      {item.name}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {(showAddNew || onAddNew) && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        onAddNew?.();
                        setOpen(false);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      <span>{addNewLabel}</span>
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </AutocompleteContext.Provider>
  );
}

Autocomplete.Value = AutocompleteValue;

export { Autocomplete, AutocompleteValue };
