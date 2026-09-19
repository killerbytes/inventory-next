"use client";

import React from "react";
import {
  ArrowDownUp,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { cx } from "class-variance-authority";
import last from "lodash/last";

export interface FilterProps {
  sort?: string;
  order?: "ASC" | "DESC";
}

const size = 14;

export default function ColumnSort<T>({
  column,
  filter,
  handleFilterChange,
  children,
  className,
  align = "left",
  sortKey,
}: {
  column: ColumnDef<T, unknown>;
  filter: FilterProps;
  handleFilterChange: (filter: FilterProps) => void;
  children: React.ReactNode;
  className?: string | string[];
  align?: "left" | "center" | "right";
  sortKey?: string;
}) {
  const columnId = sortKey || (column.id ? last(column.id.split("_")) : "");

  return (
    <span
      className={cx(
        "flex items-center gap-1 cursor-pointer select-none",
        className,
        align === "right" && "justify-end",
        align === "left" && "justify-start",
        align === "center" && "justify-center"
      )}
      onClick={() => {
        handleFilterChange({
          order: filter.order === "ASC" ? "DESC" : "ASC",
          sort: columnId,
        });
      }}
    >
      {children}
      {filter.sort === columnId && filter.order === "ASC" ? (
        <ArrowUpNarrowWide size={size} />
      ) : filter.sort === columnId ? (
        <ArrowDownWideNarrow size={size} />
      ) : (
        <ArrowDownUp className="opacity-50" size={size} />
      )}
    </span>
  );
}
