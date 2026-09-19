import React from "react";
import { INVENTORY_MOVEMENT_MAP } from "@/types/definitions";
import { cx } from "class-variance-authority";
import { Badge } from "@/components/ui/badge";

export default function ColorBadge({
  className,
  children,
  colorMap = {},
  ...props
}: {
  className?: string;
  children: string | undefined;
  colorMap?: Record<string, string>;
  [key: string]: any;
}) {
  const unit = (children?.toUpperCase() || "") as keyof typeof colorMap;
  const value = (INVENTORY_MOVEMENT_MAP as Record<string, string>)[unit];
  return (
    <Badge
      className={cx(
        "text-[8px] px-1.5",
        className,
        colorMap[unit] || "bg-white text-black dark:bg-zinc-800 dark:text-white"
      )}
      {...props}
    >
      {value || unit}
    </Badge>
  );
}
