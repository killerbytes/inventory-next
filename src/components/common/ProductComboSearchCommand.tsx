import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import useDebounce from "@/hooks/useDebounce";
import * as React from "react";
import GroupedCommandList, { ProductComboItem } from "./GroupedCommandList";
import Loader from "./Loader";

export interface ProductComboSearchProps {
  onSelect?: (item: ProductComboItem) => void;
  children?: React.ReactNode;
  onSearch: (search: string) => Promise<ProductComboItem[]>;
  className?: string;
  render?: (props: { setOpen: (open: boolean) => void }) => React.ReactNode;
  renderOptions?: (props: {
    items: ProductComboItem[];
    open: boolean;
    setOpen: (open: boolean) => void;
    onSelect?: (item: ProductComboItem) => void;
    search: string;
  }) => React.ReactNode;
  "aria-invalid"?: React.ComponentProps<"button">["aria-invalid"];
}

function ProductComboSearchCommandComponent({
  onSelect,
  onSearch,
  children,
  className,
  render,
  renderOptions = (props) => <GroupedCommandList {...props} />,
  "aria-invalid": isInvalid,
}: ProductComboSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);
  const [items, setItems] = React.useState<ProductComboItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debouncedQuery = useDebounce(search, 300);

  const onSearchRef = React.useRef(onSearch);
  React.useEffect(() => {
    onSearchRef.current = onSearch;
  });

  React.useEffect(() => {
    const getData = async () => {
      setLoading(true);
      try {
        const data = await onSearchRef.current(debouncedQuery);

        setItems(data || []);
      } catch (err) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    if (debouncedQuery) {
      getData();
    }
  }, [debouncedQuery]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo?.(0, 0);
    }
  }, [items]);

  return (
    <div className={className}>
      {render ? (
        render({ setOpen })
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full justify-start"
          aria-invalid={isInvalid}
        >
          {children}
        </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen} className="md:w-[50vw]">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList ref={listRef} className="md:max-h-160 overflow-y-auto">
            {loading && (
              <CommandEmpty>
                <Loader />
              </CommandEmpty>
            )}
            {!loading && debouncedQuery && items.length === 0 ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              <CommandEmpty>Type to search for products...</CommandEmpty>
            )}
            {renderOptions({ items, open, setOpen, onSelect, search })}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}

export default React.memo(ProductComboSearchCommandComponent);
