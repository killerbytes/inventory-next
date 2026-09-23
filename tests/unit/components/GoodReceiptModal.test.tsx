import GoodReceiptModal from "@/components/modals/GoodReceiptModal";
import { useUIStore } from "@/stores/uiStore";
import { ORDER_STATUS } from "@/types/definitions";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/server/actions/goodReceipt.actions", () => ({
  createGoodReceiptAction: vi.fn(),
  updateGoodReceiptAction: vi.fn(),
}));

describe("GoodReceiptModal & UI Store Integration", () => {
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
    act(() => {
      useUIStore.getState().setGoodReceiptModalOpen(false);
    });
  });

  it("should support isGoodReceiptModalOpen and editingGoodReceipt in useUIStore", () => {
    const store = useUIStore.getState() as any;

    expect(store.isGoodReceiptModalOpen).toBe(false);
    expect(store.editingGoodReceipt).toBeNull();

    act(() => {
      store.setGoodReceiptModalOpen(true);
    });

    const openStore = useUIStore.getState() as any;
    expect(openStore.isGoodReceiptModalOpen).toBe(true);
    expect(openStore.editingGoodReceipt).toBeNull();

    const mockReceipt = {
      id: 99,
      referenceNo: "GR-TEST-99",
      status: ORDER_STATUS.DRAFT,
      supplierId: 1,
      goodReceiptLines: [],
    };

    act(() => {
      store.setGoodReceiptModalOpen(true, mockReceipt as any);
    });

    const editingStore = useUIStore.getState() as any;
    expect(editingStore.isGoodReceiptModalOpen).toBe(true);
    expect(editingStore.editingGoodReceipt).toEqual(mockReceipt);

    act(() => {
      store.setGoodReceiptModalOpen(false);
    });

    const closedStore = useUIStore.getState() as any;
    expect(closedStore.isGoodReceiptModalOpen).toBe(false);
  });

  it("should render null when isGoodReceiptModalOpen is false", async () => {
    act(() => {
      useUIStore.getState().setGoodReceiptModalOpen(false);
    });

    await act(async () => {
      root?.render(<GoodReceiptModal suppliers={[]} />);
    });

    expect(container?.innerHTML).toBe("");
  });

  it("should render Create Good Receipt title when opened in create mode", async () => {
    act(() => {
      useUIStore.getState().setGoodReceiptModalOpen(true, null);
    });

    await act(async () => {
      root?.render(<GoodReceiptModal suppliers={[]} />);
    });

    expect(document.body.textContent).toContain("Create Good Receipt");
    expect(document.body.textContent).toContain("Receive supplier shipments and purchase orders.");
  });

  it("should render Edit Good Receipt title when opened with editingGoodReceipt", async () => {
    const mockReceipt = {
      id: 42,
      referenceNo: "GR-2026-0042",
      status: ORDER_STATUS.DRAFT,
      supplierId: 10,
      receiptDate: new Date("2026-09-01"),
      goodReceiptLines: [],
    };

    act(() => {
      useUIStore.getState().setGoodReceiptModalOpen(true, mockReceipt as any);
    });

    await act(async () => {
      root?.render(<GoodReceiptModal suppliers={[]} />);
    });

    expect(document.body.textContent).toContain("Edit Good Receipt (GR-2026-0042)");
    expect(document.body.textContent).toContain("Modify draft good receipt lines, quantities, and supplier order details.");
  });
});
