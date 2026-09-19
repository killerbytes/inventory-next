"use client";

import ColorBadge from "@/components/common/ColorBadge";
import { DataTable } from "@/components/common/DataTable";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReturnItemData, ReturnTransactionData } from "@/schemas";
import { INVENTORY_MOVEMENT_TYPE, UNIT_COLOR } from "@/types/definitions";
import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";

const columnHelper = createColumnHelper<ReturnItemData>();

export default function ReturnTransactionsTable({
  data,
}: {
  data: ReturnTransactionData[];
}) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("combination", {
        header: "Product",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <ColorBadge colorMap={UNIT_COLOR}>
              {String(row.original.combination.unit)}
            </ColorBadge>

            <Link
              href={`/products/${row.original.combination.productId}`}
              className="font-medium text-emerald-600 hover:underline"
            >
              {row.original.combination.name}
            </Link>
          </div>
        ),
      }),
      columnHelper.accessor("quantity", {
        header: "Qty",
        cell: ({ row }) => (
          <span className="font-mono">{Number(row.original.quantity)}</span>
        ),
      }),
      columnHelper.accessor("reason", {
        meta: {
          className: "text-xs",
        },
        header: "Reason",
      }),
      columnHelper.accessor("unitPrice", {
        header: "Unit Price",
        meta: {
          align: "right",
        },
        cell: ({ row }) => formatCurrency(row.original.unitPrice),
      }),
      columnHelper.accessor("totalAmount", {
        meta: {
          align: "right",
        },
        header: "Total Amount",
        cell: ({ row }) => formatCurrency(row.original.totalAmount),
      }),
    ],
    [],
  );

  return (
    <Accordion type="multiple" className="w-full space-y-2">
      {data?.map((item) => {
        const returns =
          item.returnItems?.filter(
            (i) => i.type === INVENTORY_MOVEMENT_TYPE.SUPPLIER_RETURN_OUT,
          ) || [];
        const exchanges =
          item.returnItems?.filter(
            (i) => i.type === INVENTORY_MOVEMENT_TYPE.EXCHANGE_IN,
          ) || [];

        return (
          <AccordionItem
            value={String(item.id)}
            key={item.id}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="flex justify-between font-bold py-3 hover:no-underline">
              <span>{formatDate(String(item.updatedAt))}</span>
              <div className="flex gap-4 ml-auto font-normal text-sm mr-4">
                <span>Returns:</span>
                <Label className="font-semibold text-rose-600">
                  {formatCurrency(item.totalReturnAmount)}
                </Label>
                {item.totalExchangeAmount && item.totalExchangeAmount > 0 && (
                  <>
                    <span>Exchanges:</span>
                    <Label className="font-semibold">
                      {formatCurrency(item.totalExchangeAmount)}
                    </Label>
                  </>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 pt-2 pb-4">
              {returns.length > 0 && (
                <div>
                  <Label className="font-bold text-rose-600 block mb-2">
                    Returns
                  </Label>
                  <DataTable
                    data={returns}
                    columns={columns}
                    renderFooter={(rows = []) => {
                      const total = rows.reduce(
                        (acc, r) => acc + Number(r.totalAmount || 0),
                        0,
                      );
                      return (
                        <TableRow>
                          <TableCell className="font-semibold">Total</TableCell>
                          <TableCell
                            colSpan={6}
                            className="text-right font-bold text-rose-600"
                          >
                            -₱{total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    }}
                  />
                </div>
              )}
              {exchanges.length > 0 && (
                <div>
                  <Label className="font-bold block mb-2">Exchanges</Label>
                  <DataTable
                    data={exchanges}
                    columns={columns}
                    renderFooter={(rows = []) => {
                      const total = rows.reduce(
                        (acc, r) => acc + Number(r.totalAmount || 0),
                        0,
                      );
                      return (
                        <TableRow>
                          <TableCell className="font-semibold">Total</TableCell>
                          <TableCell
                            colSpan={6}
                            className="text-right font-bold"
                          >
                            ₱{total.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    }}
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
