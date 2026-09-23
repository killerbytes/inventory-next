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
import { MAX_START_DATE } from "@/types/definitions";

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (value: DateRange) => void;
  className?: string;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  numberOfMonths?: number;
}

export default function DateRangePicker({
  value,
  onChange,
  className,
  placeholder = "Pick a date range",
  disabled,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selectedRange: DateRange | undefined) => {
    if (!selectedRange) {
      onChange({ from: undefined, to: undefined });
      return;
    }
    const { from, to } = selectedRange;
    onChange({
      from,
      to,
    });
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ from: undefined, to: undefined });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id="date"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal group h-10",
              !value?.from && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "LLL dd, y")} -{" "}
                  {format(value.to, "LLL dd, y")}
                </>
              ) : (
                format(value.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
            {value?.from && (
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
          defaultMonth={value?.from || new Date()}
          selected={{
            from: value?.from ? startOfDay(value.from) : undefined,
            to: value?.to ? endOfDay(value.to) : undefined,
          }}
          onSelect={handleSelect}
          numberOfMonths={numberOfMonths}
          disabled={disabled || { before: new Date(MAX_START_DATE) }}
        />
      </PopoverContent>
    </Popover>
  );
}
