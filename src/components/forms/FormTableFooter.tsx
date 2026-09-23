import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";
import { ComputableItem } from "../../lib/compute";

export interface FormTableFooterProps {
  onAdd: () => void;
  values: ComputableItem[];
}

export default function FormTableFooter({
  onAdd,
  values,
}: FormTableFooterProps) {
  const total = values.reduce(
    (acc, item) => {
      const price = Number(item.purchasePrice);
      const discount = Number(item?.discount || 0);
      const lineTotal = price * (Number(item.quantity) || 0) - discount;

      return {
        totalAmount: acc.totalAmount + lineTotal,
        totalPrice: acc.totalPrice + price,
        totalDiscount: acc.totalDiscount + discount,
      };
    },
    { totalAmount: 0, totalDiscount: 0, totalPrice: 0 },
  );

  return (
    <>
      <TableRow>
        <TableCell colSpan={8}>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onAdd()}
          >
            <Plus />
          </Button>
        </TableCell>
      </TableRow>
      <TableRow className="font-bold">
        <TableCell>Total</TableCell>
        <TableCell colSpan={7} className="text-right">
          {formatCurrency(total?.totalAmount || 0)}
        </TableCell>
      </TableRow>
    </>
  );
}
