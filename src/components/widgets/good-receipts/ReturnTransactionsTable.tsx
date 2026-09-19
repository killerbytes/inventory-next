import ColorBadge from "@/components/common/ColorBadge";
import DataTable from "@/components/common/DataTable";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReturnItemData, ReturnTransactionData } from "@/schemas";
import { ROUTES, UNIT_COLOR } from "@/types/definitions";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import React from "react";
import { Label } from "recharts";

export default function ReturnTransactionsTable({
  data,
}: {
  data: ReturnTransactionData[];
}) {
  // const data = _data.map((item) => {
  //   return mapReturnTransactionToDomain(item);
  // });

  const columns = React.useMemo<ColumnDef<ReturnItemData>[]>(
    () => [
      {
        accessorKey: "index",
        header: "#",
        size: 20,
        cell: ({ row }) => {
          return row.index + 1;
        },
      },
      {
        header: "Quantity",
        accessorKey: "quantity",
        size: 20,
        meta: {
          headerClassName: "text-right",
          className: "text-right",
        },

        cell: ({ row }) => {
          return Number(row.original.quantity);
        },
      },
      {
        header: "Unit",
        accessorKey: "unit",
        cell: ({ row }) => {
          return (
            <ColorBadge colorMap={UNIT_COLOR}>
              {String(row.original.combination?.unit)}
            </ColorBadge>
          );
        },
      },
      {
        accessorKey: "nameSnapshot",
        header: "Product",
        cell: ({ row }) => {
          return (
            <Link
              href={`${ROUTES.PRODUCTS}/${row.original.combination?.productId}`}
            >
              {row.original.combination?.name}
            </Link>
          );
        },
      },
      {
        accessorKey: "reason",
        header: "Reason",
        meta: {
          className: "text-xs text-red-500",
        },
      },
      {
        header: "Price",
        accessorKey: "unitPrice",
        meta: {
          headerClassName: "text-right",
          className: "text-right",
        },

        cell: ({ row }) => {
          return formatCurrency(Number(row.original.unitPrice));
        },
      },
      {
        header: "Amount",
        accessorKey: "totalAmount",
        meta: {
          headerClassName: "text-right",
          className: "text-right",
        },

        cell: ({ row }) => {
          return formatCurrency(Number(row.original.totalAmount));
        },
      },
    ],
    [],
  );

  return (
    <>
      <Label className="font-bold">Return Transactions</Label>

      <div className="w-full">
        {data?.map((item) => {
          const returns = item.returnItems.filter((i) => i.type === "RETURN");
          const exchanges = item.returnItems.filter(
            (i) => i.type === "EXCHANGE",
          );
          return (
            <div>
              <div className="flex justify-between font-bold">
                {formatDate(item.updatedAt)}
                <div className="flex gap-4 ml-auto font-normal">
                  <span>Returns:</span>
                  <Label className="font-semibold text-red-500">
                    {formatCurrency(item.totalReturnAmount)}
                  </Label>
                  {item.totalExchangeAmount && item.totalExchangeAmount > 0 && (
                    <>
                      <span>Exchanges:</span>
                      <Label className="font-semibold ">
                        {formatCurrency(item.totalExchangeAmount)}
                      </Label>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {returns.length > 0 && (
                  <>
                    <Label className="font-bold">Returns</Label>
                    <DataTable
                      data={returns}
                      columns={columns}
                      renderFooter={(data = []) => {
                        const total = data.reduce(
                          (acc, item) => (acc += Number(item.totalAmount)),
                          0,
                        );
                        return (
                          <TableRow>
                            <TableCell>Total</TableCell>
                            <TableCell
                              colSpan={10}
                              className="text-right font-bold text-red-500"
                            >
                              -{formatCurrency(total)}
                            </TableCell>
                          </TableRow>
                        );
                      }}
                    />
                  </>
                )}
                {exchanges.length > 0 && (
                  <>
                    <Label className="font-bold">Exchange</Label>
                    <DataTable
                      data={exchanges}
                      columns={columns}
                      renderFooter={(data = []) => {
                        const total = data.reduce(
                          (acc, item) => (acc += Number(item.totalAmount)),
                          0,
                        );
                        return (
                          <TableRow>
                            <TableCell>Total</TableCell>
                            <TableCell
                              colSpan={10}
                              className="text-right font-bold"
                            >
                              {formatCurrency(total)}
                            </TableCell>
                          </TableRow>
                        );
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
