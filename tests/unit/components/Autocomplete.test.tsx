import {
  Autocomplete,
  AutocompleteOption,
  AutocompleteValue,
} from "@/components/common/Autocomplete";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Autocomplete & AutocompleteValue Component", () => {
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

  it("renders AutocompleteValue with explicit value", async () => {
    // Arrange & Act
    await act(async () => {
      root?.render(<AutocompleteValue value="Acme Corporation" />);
    });

    // Assert
    const element = container?.querySelector(
      '[data-slot="autocomplete-value"]',
    );
    expect(element).not.toBeNull();
    expect(element?.textContent).toBe("Acme Corporation");
    expect(element?.classList.contains("text-muted-foreground")).toBe(false);
  });

  it("renders AutocompleteValue with placeholder when value is null or empty", async () => {
    // Arrange & Act
    await act(async () => {
      root?.render(
        <AutocompleteValue value={null} placeholder="Select a supplier..." />,
      );
    });

    // Assert
    const element = container?.querySelector(
      '[data-slot="autocomplete-value"]',
    );
    expect(element).not.toBeNull();
    expect(element?.textContent).toBe("Select a supplier...");
    expect(element?.classList.contains("text-muted-foreground")).toBe(true);
  });

  it("renders Autocomplete with nested AutocompleteValue child", async () => {
    const options: AutocompleteOption[] = [
      { id: 1, name: "Supplier Alpha" },
      { id: 2, name: "Supplier Beta" },
    ];
    const handleChange = vi.fn();

    // Arrange & Act
    await act(async () => {
      root?.render(
        <Autocomplete
          options={options}
          placeholder="Select Supplier"
          onChange={handleChange}
        >
          <AutocompleteValue value="Supplier Alpha" />
        </Autocomplete>,
      );
    });

    // Assert
    const button = container?.querySelector('button[role="combobox"]');
    expect(button).not.toBeNull();
    const valueSlot = button?.querySelector('[data-slot="autocomplete-value"]');
    expect(valueSlot?.textContent).toBe("Supplier Alpha");
  });

  it("inherits value and placeholder from Autocomplete context when omitted in AutocompleteValue", async () => {
    const handleChange = vi.fn();

    // Arrange & Act
    await act(async () => {
      root?.render(
        <Autocomplete
          value="Inherited Value"
          placeholder="Default Placeholder"
          options={[]}
          onChange={handleChange}
        >
          <AutocompleteValue />
        </Autocomplete>,
      );
    });

    // Assert
    const valueSlot = container?.querySelector(
      '[data-slot="autocomplete-value"]',
    );
    expect(valueSlot?.textContent).toBe("Inherited Value");
  });
});
