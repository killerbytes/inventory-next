"use client";

import {
  ColumnDef,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  OnChangeFn,
  RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cx } from "class-variance-authority";
import React from "react";

import Pager, { PagerMeta } from "@/components/common/Pager";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data?: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  searchKey?: string;
  paginate?: boolean;
  paginationMeta?: PagerMeta;
  paginationFilter?: any;
  setPaginationFilter?: (action: any) => void;
  meta?: {
    disabledRow?: Record<string, boolean | string | number>;
    emptyText?: string;
    subRows?: string;
    className?: string;
  };
  onRowClick?: (row: TData) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  getRowId?: (row: TData, index: number) => string;
  renderFooter?: (data: TData[]) => React.ReactNode;
}

export function DataTable<TData>({
  columns,
  data = [],
  isLoading = false,
  emptyMessage = "No data available",
  className = "",
  searchKey,
  paginate,
  paginationMeta,
  paginationFilter,
  setPaginationFilter,
  meta,
  onRowClick,
  rowSelection,
  onRowSelectionChange,
  getRowId,
  renderFooter,
}: DataTableProps<TData>) {
  const [internalRowSelection, setInternalRowSelection] =
    React.useState<RowSelectionState>({});
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      rowSelection: rowSelection ?? internalRowSelection,
      expanded,
    },
    enableRowSelection: true,
    onRowSelectionChange: onRowSelectionChange ?? setInternalRowSelection,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    onExpandedChange: setExpanded,
    getSubRows: (row) => {
      if (!meta?.subRows) return undefined;
      const children = (row as Record<string, any>)[meta.subRows];
      return Array.isArray(children) ? (children as TData[]) : undefined;
    },
    getExpandedRowModel: getExpandedRowModel(),
  });

  const [disabledKey, disabledValue] = meta?.disabledRow
    ? Object.entries(meta.disabledRow)[0]
    : [null, null];

  React.useEffect(() => {
    if (data.length && meta?.subRows) {
      table.toggleAllRowsExpanded(true);
    }
  }, [data, table]);

  return (
    <div>
      <div className={cx("w-full overflow-auto border shadow rounded-md")}>
        <Table className="overflow bg-white">
          <TableHeader className="text-xs ">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as any;
                  const align = meta?.align || "left";

                  const alignClass =
                    align === "right"
                      ? "text-right"
                      : align === "center"
                        ? "text-center"
                        : "text-left";

                  const headerClassName =
                    meta?.headerClassName || meta?.className;

                  return (
                    <TableHead
                      key={header.id}
                      className={cx("h-10 p-2", alignClass, headerClassName)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="p-8 text-center text-muted-foreground"
                >
                  <div className="flex items-center justify-center gap-3">
                    <span
                      data-testid="data-table-spinner"
                      className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent text-primary rounded-full"
                    ></span>
                    <span>Loading table data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="p-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isDisabled = disabledKey
                  ? disabledKey
                      .split(".")
                      .reduce(
                        (acc: unknown, key) =>
                          (acc as Record<string, unknown>)?.[key],
                        row.original,
                      ) === disabledValue
                  : null;

                return (
                  <TableRow
                    key={row.id}
                    onClick={() => onRowClick && onRowClick(row.original)}
                    className={cx(
                      "odd:bg-gray-100",
                      { "cursor-pointer": onRowClick && !isDisabled },
                      isDisabled
                        ? "pointer-events-none bg-muted text-muted-foreground opacity-50"
                        : "hover:bg-gray-300",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const cellMeta = cell.column.columnDef.meta as any;
                      const cellAlign = cellMeta?.align || "left";
                      const cellAlignClass =
                        cellAlign === "right"
                          ? "text-right"
                          : cellAlign === "center"
                            ? "text-center"
                            : "text-left";
                      return (
                        <TableCell
                          key={cell.id}
                          className={cx(
                            "p-2",
                            cellAlignClass,
                            cellMeta?.className,
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {renderFooter && <TableFooter>{renderFooter(data)}</TableFooter>}
        </Table>
      </div>
      {paginate && paginationMeta && (
        <Pager
          meta={paginationMeta}
          filter={paginationFilter}
          setFilter={setPaginationFilter}
        />
      )}
    </div>
  );
}

export default DataTable;
