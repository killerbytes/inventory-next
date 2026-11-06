import GlobalError from "@/app/global-error";
import * as Sentry from "@sentry/nextjs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("GlobalError Component (Unit)", () => {
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
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
    container = null;
    root = null;
  });

  it("should capture exception with Sentry on mount", async () => {
    const testError = new Error("Test critical failure");
    const mockReset = vi.fn();

    await act(async () => {
      root?.render(<GlobalError error={testError} reset={mockReset} />);
    });

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(testError);
  });

  it("should invoke reset callback when user clicks retry action button", async () => {
    const testError = new Error("Recoverable crash");
    const mockReset = vi.fn();

    await act(async () => {
      root?.render(<GlobalError error={testError} reset={mockReset} />);
    });

    const retryButton = container?.querySelector("button");
    expect(retryButton).not.toBeNull();

    await act(async () => {
      retryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});

