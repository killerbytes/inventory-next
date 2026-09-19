"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "cn";

interface CheckboxProps
  extends Omit<
    React.ComponentProps<typeof CheckboxPrimitive.Root>,
    "checked" | "onCheckedChange"
  > {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
}

function Checkbox({
  className,
  checked,
  onCheckedChange,
  indeterminate,
  ...props
}: CheckboxProps) {
  const isIndeterminate = indeterminate || checked === "indeterminate";
  const isChecked = checked === true;

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      checked={isChecked}
      indeterminate={isIndeterminate}
      onCheckedChange={(nextChecked) => {
        onCheckedChange?.(nextChecked);
      }}
      className={cn(
        "peer inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[checked]:text-primary-foreground data-[checked]:border-primary data-[indeterminate]:bg-primary data-[indeterminate]:text-primary-foreground data-[indeterminate]:border-primary",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        {isIndeterminate ? (
          <Minus className="size-3.5 stroke-[2.5]" />
        ) : (
          <Check className="size-3.5 stroke-[2.5]" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
