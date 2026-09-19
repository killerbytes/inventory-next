"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ColumnDef,
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { GripHorizontal } from "lucide-react";
import React from "react";

interface HasId {
  id: number | string;
}

function RowDragHandleCell({ rowId }: { rowId: string }) {
  const { attributes, listeners } = useSortable({
    id: String(rowId),
  });
  return (
    <Button
      {...attributes}
      {...listeners}
      type="button"
      variant="ghost"
      size="icon"
      className="cursor-grab active:cursor-grabbing h-8 w-8 text-muted-foreground hover:text-foreground"
    >
      <GripHorizontal className="h-4 w-4" />
    </Button>
  );
}

function DraggableRow<T extends HasId>({ row }: { row: Row<T> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: String(row.original.id),
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 2 : 0,
    position: "relative",
  };

  return (
    <TableRow
      key={row.id}
      ref={setNodeRef}
      style={style}
      className={isDragging ? "bg-muted/80 shadow-md" : undefined}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={(cell.column.columnDef.meta as any)?.className}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export interface DnDTableProps<T extends HasId> {
  columns: ColumnDef<T, any>[];
  data: T[];
  onSubmit: (data: T[]) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  tableClassname?: string;
}

export default function DnDTable<T extends HasId>({
  columns: initialColumns,
  data: initialData,
  onSubmit,
  disabled = false,
  className,
  tableClassname,
}: DnDTableProps<T>) {
  const [data, setData] = React.useState<T[]>(initialData);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const columns = React.useMemo<ColumnDef<T>[]>(
    () => [
      ...(!disabled
        ? [
            {
              id: "drag-handle",
              header: () => <span className="sr-only">Move</span>,
              cell: ({ row }: { row: Row<T> }) => (
                <RowDragHandleCell rowId={String(row.original.id)} />
              ),
              meta: {
                className: "w-10 text-center",
              },
            } as ColumnDef<T>,
          ]
        : []),
      ...initialColumns,
    ],
    [disabled, initialColumns],
  );

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => String(id)) || [],
    [data],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = dataIds.indexOf(active.id);
      const newIndex = dataIds.indexOf(over.id);
      const newData = arrayMove(data, oldIndex, newIndex);

      setData(newData);
      await onSubmit(newData);
    }
  };

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <div className={`w-full overflow-auto ${className || ""}`}>
        <div
          className={`rounded-md border overflow-hidden ${tableClassname || ""}`}
        >
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <SortableContext
                items={dataIds}
                strategy={verticalListSortingStrategy}
              >
                {table.getRowModel().rows.map((row) => (
                  <DraggableRow key={row.id} row={row} />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </div>
      </div>
    </DndContext>
  );
}
