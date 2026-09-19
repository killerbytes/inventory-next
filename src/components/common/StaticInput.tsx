"use client";

import React from "react";
import { cx } from "class-variance-authority";

interface StaticInputProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number;
  error?: string;
}

export function StaticInput({
  value,
  error,
  className,
  ...props
}: StaticInputProps) {
  return (
    <div
      {...props}
      aria-invalid={!!error}
      className={cx(
        "w-full rounded-md px-3 py-2 text-sm border bg-muted/20",
        error
          ? "border-rose-500 ring-rose-500 text-rose-600 font-medium"
          : "text-muted-foreground border-input",
        className
      )}
    >
      {value}
    </div>
  );
}
