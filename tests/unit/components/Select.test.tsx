import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Select Component (Unit)", () => {
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

  it("should configure SelectContent to size to content width rather than being constrained by w-(--anchor-width)", async () => {
    // Arrange
    const items = [
      { value: "opt1", label: "Short" },
      {
        value: "opt2",
        label: "304 Flexible Hose (Water) - 80cm | 1/2*1/2 - Very Long Option Label",
      },
    ];

    function TestSelect() {
      return (
        <Select open defaultValue="opt1" items={items}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Act
    await act(async () => {
      root?.render(<TestSelect />);
    });

    // Assert
    const popup = document.querySelector('[data-slot="select-content"]');
    expect(popup).not.toBeNull();
    // Must use min-w-(--anchor-width) so it does not collapse below trigger width,
    // but expands to the width of its contents.
    expect(popup?.classList.contains("min-w-(--anchor-width)")).toBe(true);
    // Must not have fixed w-(--anchor-width) locking its width to the trigger.
    expect(popup?.classList.contains("w-(--anchor-width)")).toBe(false);
  });
});
