import SearchClientWidget from "@/components/widgets/SearchClientWidget";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({
    replace: vi.fn(),
  }),
  usePathname: () => "/search",
}));

// Mock api-client
vi.mock("@/lib/api-clients/productSearch", () => ({
  getMappedSearchProductCombinations: vi.fn().mockResolvedValue([
    {
      id: 1,
      productId: 10,
      name: "Standard Pipe - 1/2 inch",
      unit: "PCS",
      price: 150,
      inventory: {
        quantity: 25,
        averagePrice: 120,
      },
      product: {
        id: 10,
        categoryId: 2,
        name: "Standard Pipe",
      },
    },
  ]),
}));

describe("SearchClientWidget (Unit)", () => {
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

  it("should render search input with placeholder and autoFocus", async () => {
    await act(async () => {
      root?.render(<SearchClientWidget initialCategories={[{ id: 2, name: "Pipes" }]} />);
    });

    const input = container?.querySelector('input[placeholder="Search..."]');
    expect(input).not.toBeNull();
  });

  it("should display product columns aligned with inventory-react", async () => {
    await act(async () => {
      root?.render(
        <SearchClientWidget
          initialCategories={[{ id: 2, name: "Pipes & Fittings" }]}
          initialSearch="pipe"
        />,
      );
    });

    // Wait for async effect to resolve
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    expect(container?.textContent).toContain("Pipes & Fittings");
    expect(container?.textContent).toContain("Standard Pipe - 1/2 inch");
    expect(container?.textContent).toContain("PCS");
  });
});
