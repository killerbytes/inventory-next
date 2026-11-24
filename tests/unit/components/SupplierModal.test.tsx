import SupplierModal from "@/components/modals/SupplierModal";
import {
  createSupplierAction,
  deleteSupplierAction,
  updateSupplierAction,
} from "@/server/actions/supplier.actions";
import { useUIStore } from "@/stores/uiStore";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: mockRefresh,
    back: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("@/server/actions/supplier.actions", () => ({
  createSupplierAction: vi.fn(),
  updateSupplierAction: vi.fn(),
  deleteSupplierAction: vi.fn(),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SupplierModal (Unit)", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
    useUIStore.setState({ isSupplierModalOpen: false, editingSupplier: null });
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

  it("should successfully submit when only supplier name is provided (leaving other fields blank)", async () => {
    // Arrange: Mock create action response
    vi.mocked(createSupplierAction).mockResolvedValue({
      success: true,
      data: { id: 1, name: "Acme Industrial" },
    } as any);

    await act(async () => {
      useUIStore.setState({ isSupplierModalOpen: true, editingSupplier: null });
      root?.render(<SupplierModal />);
    });

    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    expect(nameInput).toBeDefined();

    // Act: Type only the supplier name
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(nameInput, "Acme Industrial");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      nameInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Act: Click submit button
    const submitBtn = Array.from(document.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Save Supplier"),
    );
    expect(submitBtn).toBeDefined();

    await act(async () => {
      submitBtn?.click();
    });

    // Assert: Action called with only name and optional fields sanitized/empty
    expect(createSupplierAction).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Acme Industrial",
        email: null,
      }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      'Supplier "Acme Industrial" created successfully!',
    );
    expect(useUIStore.getState().isSupplierModalOpen).toBe(false);
  });

  it("should block submission and show error when email format is invalid", async () => {
    await act(async () => {
      useUIStore.setState({ isSupplierModalOpen: true, editingSupplier: null });
      root?.render(<SupplierModal />);
    });

    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(nameInput, "Acme Industrial");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      nativeSetter?.call(emailInput, "not-an-email");
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const submitBtn = Array.from(document.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Save Supplier"),
    );

    await act(async () => {
      submitBtn?.click();
    });

    expect(createSupplierAction).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Please enter a valid email address.");
  });

  it("should block submission when name is shorter than 2 characters", async () => {
    await act(async () => {
      useUIStore.setState({ isSupplierModalOpen: true, editingSupplier: null });
      root?.render(<SupplierModal />);
    });

    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(nameInput, "A");
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const submitBtn = Array.from(document.querySelectorAll("button")).find((btn) =>
      btn.textContent?.includes("Save Supplier"),
    );

    await act(async () => {
      submitBtn?.click();
    });

    expect(createSupplierAction).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Name must be at least 2 characters.");
  });

  it("should not render delete button when creating a new supplier, but render it when editing", async () => {
    // Arrange & Act: Add mode (no editingSupplier)
    await act(async () => {
      useUIStore.setState({ isSupplierModalOpen: true, editingSupplier: null });
      root?.render(<SupplierModal />);
    });

    // Assert: Delete trash button must NOT be rendered when adding a new supplier
    const trashIconAdd = document.querySelector(".lucide-trash-2");
    expect(trashIconAdd).toBeNull();

    // Arrange & Act: Edit mode
    await act(async () => {
      useUIStore.setState({
        isSupplierModalOpen: true,
        editingSupplier: { id: 1, name: "Existing Supplier" } as any,
      });
      root?.render(<SupplierModal />);
    });

    // Assert: Delete trash button must be rendered when editing
    const trashIconEdit = document.querySelector(".lucide-trash-2");
    expect(trashIconEdit).not.toBeNull();
  });
});
