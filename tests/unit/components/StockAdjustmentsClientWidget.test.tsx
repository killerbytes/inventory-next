import StockAdjustmentsClientWidget from "@/components/widgets/StockAdjustmentsClientWidget";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/PageHeader", () => ({
  default: ({ title }: { title: any }) => <div data-testid="page-header">{title}</div>,
}));

describe("StockAdjustmentsClientWidget (Unit)", () => {
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

  const sampleAdjustments = [
    {
      id: 44,
      referenceNo: "REF-0044",
      combinationId: 1117,
      systemQuantity: 144,
      newQuantity: 14,
      difference: -130,
      reason: "ERROR_CORRECTION",
      notes: "system bug corrected",
      createdAt: "2026-01-12T07:16:32.813Z",
      combination: {
        id: 1117,
        productId: 266,
        name: "[Eagle Cement] - 25KG | Advance",
        unit: "PCS",
        product: { id: 266, name: "[Eagle Cement]" },
      },
      user: { id: 2, name: "Staff User" },
    },
    {
      id: 45,
      referenceNo: "REF-0045",
      combinationId: 1118,
      systemQuantity: 50,
      newQuantity: 80,
      difference: 30,
      reason: "FOUND_STOCK",
      notes: "found in back warehouse",
      createdAt: "2026-01-15T09:00:00.000Z",
      combination: {
        id: 1118,
        productId: 266,
        name: "[Eagle Cement] - 40KG",
        unit: "PCS",
        product: { id: 266, name: "[Eagle Cement]" },
      },
      user: { id: 2, name: "Staff User" },
    },
  ];

  it("renders headers including Original Quantity, Change, and New Quantity", async () => {
    await act(async () => {
      root?.render(
        <StockAdjustmentsClientWidget initialAdjustments={sampleAdjustments} />,
      );
    });

    const text = container?.textContent || "";
    expect(text).toContain("Original Quantity");
    expect(text).toContain("Change");
    expect(text).toContain("New Quantity");
  });

  it("renders difference values with directional styling", async () => {
    await act(async () => {
      root?.render(
        <StockAdjustmentsClientWidget initialAdjustments={sampleAdjustments} />,
      );
    });

    const text = container?.textContent || "";

    // Values parity
    expect(text).toContain("144");
    expect(text).toContain("-130");
    expect(text).toContain("14");

    expect(text).toContain("50");
    expect(text).toContain("+30");
    expect(text).toContain("80");

    // Negative change directional styling
    const negativeDiff = container?.querySelector(".text-rose-600");
    expect(negativeDiff?.textContent).toContain("-130");

    // Positive change directional styling
    const positiveDiff = container?.querySelector(".text-emerald-600");
    expect(positiveDiff?.textContent).toContain("+30");
  });
});
