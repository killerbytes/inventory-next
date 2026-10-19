import DebouncedSearchInput from "@/components/common/DebouncedSearchInput";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("DebouncedSearchInput Unit Tests", () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  const setInputValue = (input: HTMLInputElement, value: string) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    nativeSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  beforeEach(() => {
    // @ts-ignore
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("renders with initial value and placeholder", async () => {
    await act(async () => {
      root?.render(
        <DebouncedSearchInput
          value="Initial Query"
          onSearchChange={vi.fn()}
          placeholder="Search items..."
        />,
      );
    });

    const input = container?.querySelector("input") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("Initial Query");
    expect(input.placeholder).toBe("Search items...");
  });

  it("updates local input immediately on keystroke without waiting for debounce", async () => {
    const handleSearchChange = vi.fn();

    await act(async () => {
      root?.render(
        <DebouncedSearchInput
          value=""
          onSearchChange={handleSearchChange}
          placeholder="Search..."
        />,
      );
    });

    const input = container?.querySelector("input") as HTMLInputElement;

    await act(async () => {
      setInputValue(input, "keyboard");
    });

    // Local input value is immediately responsive
    expect(input.value).toBe("keyboard");
    // onSearchChange should not be called immediately
    expect(handleSearchChange).not.toHaveBeenCalled();
  });

  it("calls onSearchChange after debounce delay (300ms)", async () => {
    const handleSearchChange = vi.fn();

    await act(async () => {
      root?.render(
        <DebouncedSearchInput
          value=""
          onSearchChange={handleSearchChange}
          debounceMs={300}
        />,
      );
    });

    const input = container?.querySelector("input") as HTMLInputElement;

    await act(async () => {
      setInputValue(input, "monitor");
    });

    expect(handleSearchChange).not.toHaveBeenCalled();

    // Advance timers by 299ms - should still not be called
    await act(async () => {
      vi.advanceTimersByTime(299);
    });
    expect(handleSearchChange).not.toHaveBeenCalled();

    // Advance 1ms more (total 300ms)
    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(handleSearchChange).toHaveBeenCalledTimes(1);
    expect(handleSearchChange).toHaveBeenCalledWith("monitor");
  });

  it("resets timer on rapid consecutive keystrokes", async () => {
    const handleSearchChange = vi.fn();

    await act(async () => {
      root?.render(
        <DebouncedSearchInput
          value=""
          onSearchChange={handleSearchChange}
          debounceMs={300}
        />,
      );
    });

    const input = container?.querySelector("input") as HTMLInputElement;

    await act(async () => {
      setInputValue(input, "a");
    });

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    await act(async () => {
      setInputValue(input, "ab");
    });

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(handleSearchChange).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(handleSearchChange).toHaveBeenCalledTimes(1);
    expect(handleSearchChange).toHaveBeenCalledWith("ab");
  });

  it("prevents rubber-banding: does not clobber new keystrokes when parent passes back the committed value", async () => {
    const handleSearchChange = vi.fn();

    await act(async () => {
      root?.render(
        <DebouncedSearchInput
          value=""
          onSearchChange={handleSearchChange}
          debounceMs={300}
        />,
      );
    });

    const input = container?.querySelector("input") as HTMLInputElement;

    // 1. User types "app"
    await act(async () => {
      setInputValue(input, "app");
    });

    // 2. Debounce expires and commits "app"
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(handleSearchChange).toHaveBeenCalledWith("app");

    // 3. User immediately continues typing "apple" while server is fetching "app"
    await act(async () => {
      setInputValue(input, "apple");
    });
    expect(input.value).toBe("apple");

    // 4. Parent re-renders because server fetch completed for "app", passing value="app"
    await act(async () => {
      root?.render(
        <DebouncedSearchInput
          value="app"
          onSearchChange={handleSearchChange}
          debounceMs={300}
        />,
      );
    });

    // CRITICAL: Input must NOT be clobbered back to "app"! It must stay "apple"
    expect(input.value).toBe("apple");

    // 5. When the user finishes "apple", debounce fires for "apple"
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(handleSearchChange).toHaveBeenCalledWith("apple");
  });

  it("synchronizes local value when parent passes an external value (e.g. filter reset)", async () => {
    const handleSearchChange = vi.fn();

    await act(async () => {
      root?.render(
        <DebouncedSearchInput
          value="active search"
          onSearchChange={handleSearchChange}
          debounceMs={300}
        />,
      );
    });

    const input = container?.querySelector("input") as HTMLInputElement;
    expect(input.value).toBe("active search");

    // Parent resets filters externally (e.g. reset button or back button) to ""
    await act(async () => {
      root?.render(
        <DebouncedSearchInput
          value=""
          onSearchChange={handleSearchChange}
          debounceMs={300}
        />,
      );
    });

    // Input should update to ""
    expect(input.value).toBe("");
  });
});
