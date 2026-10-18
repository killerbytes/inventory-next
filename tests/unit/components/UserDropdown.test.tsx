import UserDropdown from "@/components/layout/UserDropdown";
import { logoutAction } from "@/server/actions/auth.actions";
import { useAuthStore } from "@/stores/authStore";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

vi.mock("@/server/actions/auth.actions", () => ({
  logoutAction: vi.fn(),
  loginAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("UserDropdown (Unit)", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();

    useAuthStore.setState({
      user: {
        id: 1,
        name: "Test Admin",
        username: "admin",
        role: "ADMIN",
      },
      isAuthenticated: true,
      token: "dummy-token",
    });
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

  it("should invoke logoutAction, clear store state, and navigate to /login on sign out", async () => {
    // Arrange
    vi.mocked(logoutAction).mockResolvedValue({ success: true });

    act(() => {
      root?.render(<UserDropdown />);
    });

    // Open dropdown menu
    const trigger = container?.querySelector('[type="button"]') || container?.querySelector('div[class*="cursor-pointer"]');
    expect(trigger).not.toBeNull();

    act(() => {
      (trigger as HTMLElement).click();
    });

    // In Radix UI DropdownMenu, items are rendered in a portal on document.body
    const signOutItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      (el) => el.textContent?.includes("Sign out")
    );
    expect(signOutItem).toBeDefined();

    // Act
    await act(async () => {
      (signOutItem as HTMLElement).click();
    });

    // Assert
    expect(logoutAction).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(mockPush).toHaveBeenCalledWith("/login");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
