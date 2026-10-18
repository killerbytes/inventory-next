"use client";

import { endOfDay, format, startOfDay } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import React from "react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MAX_START_DATE } from "@/constants";

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (value: DateRange) => void;
  className?: string;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  numberOfMonths?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  commitOnClose?: boolean;
}

export default function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = "Pick a date range",
  disabled,
  numberOfMonths = 2,
  open: controlledOpen,
  onOpenChange,
  commitOnClose = false,
}: DateRangePickerProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(value);

  React.useEffect(() => {
    if (!open) {
      setDraftRange(value);
    }
  }, [value, open]);

  const isRangeEqual = (a?: DateRange, b?: DateRange) => {
    const aFrom = a?.from ? a.from.getTime() : null;
    const aTo = a?.to ? a.to.getTime() : null;
    const bFrom = b?.from ? b.from.getTime() : null;
    const bTo = b?.to ? b.to.getTime() : null;
    return aFrom === bFrom && aTo === bTo;
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && commitOnClose) {
      if (!isRangeEqual(draftRange, value)) {
        onChange(draftRange || { from: undefined, to: undefined });
      }
    }
    if (nextOpen && commitOnClose) {
      setDraftRange(value);
    }
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const handleSelect = (selectedRange: DateRange | undefined) => {
    const newRange = selectedRange
      ? { from: selectedRange.from, to: selectedRange.to }
      : { from: undefined, to: undefined };

    setDraftRange(newRange);

    if (!commitOnClose) {
      onChange(newRange);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    const emptyRange = { from: undefined, to: undefined };
    setDraftRange(emptyRange);
    onChange(emptyRange);
  };

  const activeRange = commitOnClose && open ? draftRange : value;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal group",
              !activeRange?.from && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {activeRange?.from ? (
              activeRange.to ? (
                <>
                  {format(activeRange.from, "LLL dd, y")} -{" "}
                  {format(activeRange.to, "LLL dd, y")}
                </>
              ) : (
                format(activeRange.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
            {activeRange?.from && (
              <span
                className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={clearSelection}
              >
                <X className="h-4 w-4" />
              </span>
            )}
          </Button>
        }
      ></PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={activeRange?.from || value?.from || new Date()}
          selected={{
            from: activeRange?.from ? startOfDay(activeRange.from) : undefined,
            to: activeRange?.to ? endOfDay(activeRange.to) : undefined,
          }}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          disabled={disabled || { before: new Date(MAX_START_DATE) }}
        />
      </PopoverContent>
    </Popover>
  );
}
