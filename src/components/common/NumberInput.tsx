"use client";

import { Input } from "@/components/ui/input";
import debounce from "lodash/debounce";
import React, { forwardRef, useMemo, useState } from "react";
import { NumericFormat } from "react-number-format";

interface NumberInputProps {
  tabIndex?: number;
  value?: number | null;
  onChange: (value: number) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  type?: "number" | "currency";
  decimalScale?: number;
  allowNegative?: boolean;
  thousandSeparator?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  "aria-invalid"?: React.ComponentProps<"button">["aria-invalid"];
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value: _value,
      onChange,
      onBlur,
      type = "number",
      decimalScale = 0,
      allowNegative = false,
      thousandSeparator = ",",
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const [displayValue, setDisplayValue] = useState<string | null>(null);

    React.useEffect(() => {
      setDisplayValue(null);
    }, [_value]);

    const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
    };

    const debouncedUpdate = useMemo(
      () =>
        debounce((val: number) => {
          onChange(val);
        }, 400),
      [onChange],
    );

    return (
      <NumericFormat
        {...props}
        getInputRef={ref}
        value={displayValue !== null ? displayValue : (_value ?? "")}
        onFocus={onFocus}
        onBlur={(e) => {
          debouncedUpdate.flush();
          setDisplayValue(null);
          onBlur?.(e);
        }}
        onValueChange={(values) => {
          const { floatValue, formattedValue } = values;
          setDisplayValue(formattedValue);
          debouncedUpdate(floatValue ?? 0);
        }}
        style={{ textAlign: "inherit" }}
        customInput={Input}
        allowNegative={allowNegative}
        decimalScale={type === "currency" ? 2 : decimalScale}
        thousandSeparator={thousandSeparator}
        {...(type === "currency" && {
          prefix: "₱",
          fixedDecimalScale: true,
        })}
        aria-invalid={ariaInvalid}
      />
    );
  },
);

NumberInput.displayName = "NumberInput";

export default NumberInput;
