import ColorBadge from "@/components/common/ColorBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNIT_COLOR } from "@/types/definitions";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("ProductDetail Select Combination Filter (Unit)", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it("should render placeholder 'All Combinations' when value is 'ALL'", async () => {
    const combinations = [
      { id: 101, name: "Shovel - Red", unit: "BOX" },
      { id: 102, name: "Shovel - Blue", unit: "PCS" },
    ];

    function TestComponent() {
      return (
        <Select
          value="ALL"
          items={[
            { value: "ALL", label: "All Combinations" },
            ...combinations.map((c) => ({
              value: String(c.id),
              label: c.name,
            })),
          ]}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Combinations">
              {(value) => {
                if (!value || value === "ALL") return "All Combinations";
                const selected = combinations.find(
                  (c) => String(c.id) === String(value),
                );
                return selected ? (
                  <span className="flex items-center gap-1.5">
                    <ColorBadge colorMap={UNIT_COLOR}>{selected.unit}</ColorBadge>
                    <span>{selected.name}</span>
                  </span>
                ) : (
                  value
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Combinations</SelectItem>
            {combinations.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                <ColorBadge colorMap={UNIT_COLOR}>{c.unit}</ColorBadge> {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    await act(async () => {
      root?.render(<TestComponent />);
    });

    const trigger = container?.querySelector('[data-slot="select-trigger"]');
    expect(trigger?.textContent).toContain("All Combinations");
  });

  it("should show combination name and unit badge instead of raw id when a combination is selected", async () => {
    const combinations = [
      { id: 101, name: "Shovel - Red", unit: "BOX" },
      { id: 102, name: "Shovel - Blue", unit: "PCS" },
    ];

    function TestComponent({ selectedId }: { selectedId: string }) {
      return (
        <Select
          value={selectedId}
          items={[
            { value: "ALL", label: "All Combinations" },
            ...combinations.map((c) => ({
              value: String(c.id),
              label: c.name,
            })),
          ]}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Combinations">
              {(value) => {
                if (!value || value === "ALL") return "All Combinations";
                const selected = combinations.find(
                  (c) => String(c.id) === String(value),
                );
                return selected ? (
                  <span className="flex items-center gap-1.5">
                    <ColorBadge colorMap={UNIT_COLOR}>{selected.unit}</ColorBadge>
                    <span>{selected.name}</span>
                  </span>
                ) : (
                  value
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Combinations</SelectItem>
            {combinations.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                <ColorBadge colorMap={UNIT_COLOR}>{c.unit}</ColorBadge> {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    await act(async () => {
      root?.render(<TestComponent selectedId="101" />);
    });

    const trigger = container?.querySelector('[data-slot="select-trigger"]');
    expect(trigger?.textContent).toContain("Shovel - Red");
    expect(trigger?.textContent).toContain("BOX");
    expect(trigger?.textContent).not.toBe("101");
  });
});
