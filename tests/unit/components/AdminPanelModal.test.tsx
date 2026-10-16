import AdminPanelModal from "@/components/modals/AdminPanelModal";
import { triggerBackupAction } from "@/server/actions/backup.actions";
import { useUIStore } from "@/stores/uiStore";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/actions/backup.actions", () => ({
  triggerBackupAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("AdminPanelModal (Unit)", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.clearAllMocks();
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

  it("should invoke triggerBackupAction and display success toast when Backup Database is clicked", async () => {
    // Arrange: open modal and mock successful action
    vi.mocked(triggerBackupAction).mockResolvedValue({
      success: true,
      message: "Database backup workflow triggered on GitHub Actions.",
      timestamp: "2026-10-16T08:00:00.000Z",
      dispatchedTo: "github-actions",
    });

    act(() => {
      useUIStore.setState({ isAdminPanelModalOpen: true });
      root?.render(<AdminPanelModal />);
    });

    const backupButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Backup Database")
    );
    expect(backupButton).toBeDefined();

    // Act
    await act(async () => {
      backupButton?.click();
    });

    // Assert
    expect(triggerBackupAction).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      "Database backup workflow triggered on GitHub Actions."
    );
  });

  it("should display error toast when triggerBackupAction fails", async () => {
    // Arrange: open modal and mock failing action
    vi.mocked(triggerBackupAction).mockRejectedValue(
      new Error("GitHub Actions workflow dispatch failed (401): Bad credentials")
    );

    act(() => {
      useUIStore.setState({ isAdminPanelModalOpen: true });
      root?.render(<AdminPanelModal />);
    });

    const backupButton = Array.from(document.querySelectorAll("button")).find(
      (btn) => btn.textContent?.includes("Backup Database")
    );

    // Act
    await act(async () => {
      backupButton?.click();
    });

    // Assert
    expect(triggerBackupAction).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(
      "GitHub Actions workflow dispatch failed (401): Bad credentials"
    );
  });
});
