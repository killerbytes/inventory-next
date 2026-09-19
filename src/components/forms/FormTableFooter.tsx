import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency, getTotalAmountTableFooter } from "@/lib/utils";
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
  const total = getTotalAmountTableFooter(values);
  console.log(values);

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
