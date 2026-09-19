"use client";

import { Badge } from "@/components/ui/badge";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { formatCurrency, getScore } from "@/lib/utils";
import { ProductCombinationData } from "@/schemas";
import { UNIT_COLOR } from "@/types/definitions";
import React, { memo, useEffect, useMemo, useRef } from "react";
import ColorBadge from "./ColorBadge";
import HighlightMatch from "./HighlightMatch";

export type ProductComboItem = ProductCombinationData & {
  product?: any;
};

export type BaseProps = ProductComboItem;

export interface GroupedCommandListProps {
  items: ProductComboItem[];
  search: string;
  onSelect?: (item: ProductComboItem) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedId?: string | number;
  heading?: string;
  disableNoQuantity?: boolean;
}

const MemoizedCommandItem = memo(
  ({
    item,
    selected,
    onSelect,
    search,
    disableNoQuantity,
  }: {
    item: ProductComboItem;
    selected?: boolean;
    onSelect: () => void;
    search: string;
    disableNoQuantity?: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const name = item.name
      ? item.name.replace(/\*\*\*[\s\S]*?\*\*\*/g, "").trim()
      : "";

    useEffect(() => {
      if (!selected || !ref.current) return;
      setTimeout(() => {
        ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 0);
    }, [selected]);

    return (
      <CommandItem
        key={item.id}
        value={name + (item.unit || "")}
        onSelect={onSelect}
        ref={selected ? ref : undefined}
        disabled={disableNoQuantity && Number(item.inventory?.quantity) === 0}
      >
        <ColorBadge colorMap={UNIT_COLOR}>{item.unit}</ColorBadge>

        <div className="flex flex-col w-full">
          <div>
            <HighlightMatch text={name} query={search || ""} />
          </div>
        </div>

        <Badge
          className="ml-auto shrink-0"
          variant={
            Number(item.inventory?.quantity) === 0 ? "destructive" : "default"
          }
        >
          {Number(item.inventory?.quantity || 0)}
        </Badge>
        <span className="w-[80px] text-right font-bold shrink-0">
          {formatCurrency(item.price || 0)}
        </span>
      </CommandItem>
    );
  },
);

MemoizedCommandItem.displayName = "MemoizedCommandItem";

export default function GroupedCommandList({
  items,
  search,
  onSelect,
  open,
  setOpen,
  selectedId,
  heading,
  disableNoQuantity = false,
}: GroupedCommandListProps) {
  const grouped = useMemo(() => {
    if (!items || items.length === 0) return [];

    const map = new Map<string, ProductComboItem[]>();
    for (const item of items) {
      const score = getScore(item.name || "", search);
      if (score <= 0) continue;

      const key = "Others";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }

    for (const [_, groupItems] of map) {
      groupItems.sort(
        (a, b) =>
          getScore(b.name || "", search) - getScore(a.name || "", search),
      );
    }

    return Array.from(map.entries());
  }, [items, search]);

  if (!open) return null;

  return (
    <div className="max-h-[80%] overflow-auto">
      <CommandGroup heading={heading}>
        {grouped.map(([groupName, groupItems]) => (
          <React.Fragment key={groupName}>
            {groupItems.map((item) => {
              return (
                <MemoizedCommandItem
                  key={item.id}
                  item={item}
                  search={search}
                  selected={String(selectedId) === String(item.id)}
                  onSelect={() => {
                    setOpen(false);
                    onSelect?.(item);
                  }}
                  disableNoQuantity={disableNoQuantity}
                />
              );
            })}
          </React.Fragment>
        ))}
      </CommandGroup>
    </div>
  );
}
