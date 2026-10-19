"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { SearchIcon, Loader2 } from "lucide-react";

export interface DebouncedSearchInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value?: string;
  onSearchChange: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  isLoading?: boolean;
}

export default function DebouncedSearchInput({
  value = "",
  onSearchChange,
  debounceMs = 300,
  placeholder = "Search...",
  className,
  inputClassName,
  isLoading = false,
  ...props
}: DebouncedSearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const lastCommittedValueRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external changes (e.g., page reset or browser navigation)
  useEffect(() => {
    if (value !== lastCommittedValueRef.current) {
      setLocalValue(value);
      lastCommittedValueRef.current = value;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [value]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setLocalValue(nextValue);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      lastCommittedValueRef.current = nextValue;
      onSearchChange(nextValue);
    }, debounceMs);
  };

  return (
    <InputGroup className={className}>
      <InputGroupInput
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
        className={inputClassName}
        {...props}
      />
      <InputGroupAddon>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </InputGroupAddon>
    </InputGroup>
  );
}
