import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/utils";

describe("formatCurrency (Unit - Sub-Cent Currency Formatting)", () => {
  it("should return '-' when value is 0", () => {
    expect(formatCurrency(0)).toBe("-");
    expect(formatCurrency("0")).toBe("-");
    expect(formatCurrency("0.00")).toBe("-");
  });

  it("should format standard positive currency with 2 decimal places", () => {
    const formatted = formatCurrency(120.5);
    expect(formatted).toContain("120.50");
  });

  it("should format sub-cent fractional amounts with extended decimal precision rather than rounding to 0.00", () => {
    // Sub-cent hardware items (e.g. screws @ ₱0.0022 or ₱0.0003)
    const formattedSmall = formatCurrency(0.0022);
    expect(formattedSmall).not.toBe("₱0.00");
    expect(formattedSmall).not.toBe("-");
    expect(formattedSmall).toContain("0.0022");

    const formattedFraction = formatCurrency(0.0804);
    expect(formattedFraction).toContain("0.0804");
  });
});
