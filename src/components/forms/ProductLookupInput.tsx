"use client";

import GroupedCommandList, {
  BaseProps,
  ProductComboItem,
} from "@/components/common/GroupedCommandList";
import ProductComboSearchCommand from "@/components/common/ProductComboSearchCommand";
import { getMappedSearchProductCombinations } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";
import { useCallback, useState } from "react";

const EMPTY_EXCLUDE: number[] = [];

export type { BaseProps, ProductComboItem };

export interface ProductLookupInputProps {
  onChange: (value: ProductComboItem) => void;
  "aria-invalid"?: React.ComponentProps<"button">["aria-invalid"];
  exclude?: number[];
  disableNoQuantity?: boolean;
  noBreakPacks?: boolean;
  valueKey?: string;
  labelKey?: string;
  selected?: any;
}

export default function ProductLookupInput({
  onChange,
  "aria-invalid": isInvalid,
  exclude = EMPTY_EXCLUDE,
  disableNoQuantity,
  noBreakPacks = false,
  valueKey = "id",
  labelKey = "name",
  selected,
}: ProductLookupInputProps) {
  const [items, setItems] = useState<ProductComboItem[]>([]);

  const onSearch = useCallback(async (search: string) => {
    const results = await getMappedSearchProductCombinations({
      search,
      noBreakPacks,
    });

    setItems(results);
    return results;
  }, []);

  const options = (items || []).filter(
    (item) => !exclude?.includes(Number(item.id)),
  );
  const selectedId = selected?.[valueKey];

  return (
    <ProductComboSearchCommand
      aria-invalid={isInvalid}
      onSearch={onSearch}
      onSelect={onChange}
      renderOptions={(props) => (
        <GroupedCommandList
          {...props}
          items={options}
          disableNoQuantity={disableNoQuantity}
          selectedId={selectedId ? Number(selectedId) : -1}
        />
      )}
    >
      <span>
        {selected?.[labelKey]
          ? String(selected?.[labelKey])
          : "Search product..."}
      </span>
      <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
    </ProductComboSearchCommand>
  );
}
