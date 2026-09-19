"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

interface DatePickerProps {
  onChange: (value: string) => void;
  value?: string | null;
  className?: string;
  placeholder?: string;
  align?: "start" | "end" | "center";
  disabled?: boolean;
}

export default function DatePicker({
  onChange,
  value,
  className,
  disabled,
  placeholder = "Pick a date",
  align = "start",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className={cn("w-full justify-between font-normal", className)}
          >
            {value ? (
              format(new Date(value), "PPP")
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className={cn("w-auto p-0", className)} align={align}>
        <Calendar
          mode="single"
          disabled={disabled}
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => {
            setOpen(false);
            if (date) {
              onChange(date.toISOString());
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
