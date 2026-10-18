import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DateRangePicker from "@/components/common/DateRangePicker";

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect, selected }: any) => (
    <div data-testid="calendar-mock">
      <button
        data-testid="select-range-btn"
        onClick={() =>
          onSelect({
            from: new Date("2026-10-01T00:00:00Z"),
            to: new Date("2026-10-15T00:00:00Z"),
          })
        }
      >
        Select Range
      </button>
      <button
        data-testid="select-start-only-btn"
        onClick={() =>
          onSelect({
            from: new Date("2026-10-01T00:00:00Z"),
            to: undefined,
          })
        }
      >
        Select Start Only
      </button>
      <span data-testid="selected-state">
        {selected?.from ? "has-from" : "no-from"}
      </span>
    </div>
  ),
}));

describe("DateRangePicker - commitOnClose (Unit)", () => {
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

  it("should call onChange immediately when commitOnClose is false (default)", async () => {
    const mockOnChange = vi.fn();

    await act(async () => {
      root?.render(
        <DateRangePicker
          open={true}
          commitOnClose={false}
          onChange={mockOnChange}
        />,
      );
    });

    const btn = document.querySelector('[data-testid="select-start-only-btn"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();

    await act(async () => {
      btn.click();
    });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith({
      from: new Date("2026-10-01T00:00:00Z"),
      to: undefined,
    });
  });

  it("should defer calling onChange until closing popup when commitOnClose is true", async () => {
    const mockOnChange = vi.fn();

    function ControlledPicker() {
      const [open, setOpen] = React.useState(true);
      return (
        <div>
          <button data-testid="close-btn" onClick={() => setOpen(false)}>
            Close
          </button>
          <DateRangePicker
            open={open}
            onOpenChange={setOpen}
            commitOnClose={true}
            onChange={mockOnChange}
          />
        </div>
      );
    }

    await act(async () => {
      root?.render(<ControlledPicker />);
    });

    const selectBtn = document.querySelector('[data-testid="select-range-btn"]') as HTMLButtonElement;
    expect(selectBtn).toBeTruthy();

    // Act: Select range while open
    await act(async () => {
      selectBtn.click();
    });

    // Assert: onChange should NOT be called while popup is open
    expect(mockOnChange).not.toHaveBeenCalled();

    // Act: Close the popup
    const closeBtn = container?.querySelector('[data-testid="close-btn"]') as HTMLButtonElement;
    await act(async () => {
      closeBtn.click();
    });

    // Assert: onChange should NOW be called with the selected range
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith({
      from: new Date("2026-10-01T00:00:00Z"),
      to: new Date("2026-10-15T00:00:00Z"),
    });
  });

  it("should not call onChange upon closing if selection was unchanged", async () => {
    const mockOnChange = vi.fn();
    const initialRange = {
      from: new Date("2026-10-01T00:00:00Z"),
      to: new Date("2026-10-15T00:00:00Z"),
    };

    function ControlledPicker() {
      const [open, setOpen] = React.useState(true);
      return (
        <div>
          <button data-testid="close-btn" onClick={() => setOpen(false)}>
            Close
          </button>
          <DateRangePicker
            open={open}
            onOpenChange={setOpen}
            value={initialRange}
            commitOnClose={true}
            onChange={mockOnChange}
          />
        </div>
      );
    }

    await act(async () => {
      root?.render(<ControlledPicker />);
    });

    // Act: Close without selecting anything new
    const closeBtn = container?.querySelector('[data-testid="close-btn"]') as HTMLButtonElement;
    await act(async () => {
      closeBtn.click();
    });

    // Assert: onChange should not be called
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
