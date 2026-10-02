import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Command UI Component (Selection & Alignment)", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    if (typeof globalThis.ResizeObserver === "undefined") {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      } as any;
    }
    if (typeof Element.prototype.scrollIntoView === "undefined") {
      Element.prototype.scrollIntoView = () => {};
    }
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

  it("should use explicit data-[selected=true] instead of bare data-selected to prevent all options from being highlighted", async () => {
    await act(async () => {
      root?.render(
        <Command>
          <CommandList>
            <CommandItem data-testid="test-item-1" value="Item 1">
              <span>Item 1</span>
            </CommandItem>
            <CommandItem data-testid="test-item-2" value="Item 2">
              <span>Item 2</span>
            </CommandItem>
          </CommandList>
        </Command>,
      );
    });

    const item1 = container?.querySelector('[data-testid="test-item-1"]');
    const className = item1?.className || "";

    // Bare `data-selected:bg-` matches data-selected="false", which highlights all options!
    // It MUST use `data-[selected=true]:`
    expect(className).not.toMatch(/(^|\s)data-selected:bg-/);
    expect(className).toContain("data-[selected=true]:");
  });

  it("should render CommandItem with children without injecting an automatic CheckIcon by default", async () => {
    await act(async () => {
      root?.render(
        <Command>
          <CommandList>
            <CommandItem data-testid="test-item">
              <span>Product Alpha</span>
              <span className="ml-auto">Custom Badge</span>
            </CommandItem>
          </CommandList>
        </Command>,
      );
    });

    const item = container?.querySelector('[data-testid="test-item"]');
    expect(item).not.toBeNull();
    expect(item?.textContent).toContain("Product Alpha");
    expect(item?.textContent).toContain("Custom Badge");

    // Must NOT inject an unrequested checkmark svg that disrupts layout
    const svgs = item?.querySelectorAll("svg") || [];
    expect(svgs.length).toBe(0);
  });

  it("should render CheckIcon only when showCheck is explicitly true", async () => {
    await act(async () => {
      root?.render(
        <Command>
          <CommandList>
            <CommandItem data-testid="checked-item" showCheck={true}>
              <span>Selected Option</span>
            </CommandItem>
          </CommandList>
        </Command>,
      );
    });

    const item = container?.querySelector('[data-testid="checked-item"]');
    const svgs = item?.querySelectorAll("svg") || [];
    expect(svgs.length).toBe(1);
  });

  it("should render CommandInput with SearchIcon positioned on the left before the input", async () => {
    await act(async () => {
      root?.render(
        <Command>
          <CommandInput placeholder="Search items..." />
        </Command>,
      );
    });

    const wrapper = container?.querySelector(
      '[data-slot="command-input-wrapper"]',
    );
    expect(wrapper).not.toBeNull();

    const input = container?.querySelector(
      'input[placeholder="Search items..."]',
    );
    expect(input).not.toBeNull();

    const svg = wrapper?.querySelector("svg");
    expect(svg).not.toBeNull();

    const childrenArray = Array.from(
      wrapper?.querySelectorAll("svg, input") || [],
    );
    expect(childrenArray.indexOf(svg!)).toBeLessThan(
      childrenArray.indexOf(input!),
    );
  });

  it("should render CommandDialog with accessible header, wrapped Command root, and children", async () => {
    await act(async () => {
      root?.render(
        <CommandDialog
          open={true}
          title="Search Products"
          description="Type to search"
        >
          <CommandInput placeholder="Search modal..." />
          <CommandList>
            <CommandEmpty>No items found</CommandEmpty>
          </CommandList>
        </CommandDialog>,
      );
    });

    const title = document.body.querySelector('[data-slot="dialog-title"]');
    expect(title?.textContent).toBe("Search Products");

    const input = document.body.querySelector(
      'input[placeholder="Search modal..."]',
    );
    expect(input).not.toBeNull();
  });
});
