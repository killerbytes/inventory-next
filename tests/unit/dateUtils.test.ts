import { format, parseISO } from "date-fns";
import { describe, expect, it } from "vitest";

describe("Timezone-Safe Date Formatting & Parsing", () => {
  it("should not shift dates backwards when formatting local midnight dates", () => {
    // Construct local midnight Date for Sep 24, 2026
    const localMidnight = new Date(2026, 8, 24, 0, 0, 0, 0);

    // Flawed pattern: toISOString().split('T')[0]
    // In any timezone ahead of UTC (e.g. GMT+8), toISOString shifts backward to previous day
    const flawedFormatted = localMidnight.toISOString().split("T")[0];
    const isAheadOfUtc = localMidnight.getTimezoneOffset() < 0;
    if (isAheadOfUtc) {
      expect(flawedFormatted).toBe("2026-09-23"); // Demonstrates the bug!
    }

    // Correct pattern: format(date, "yyyy-MM-dd")
    const correctFormatted = format(localMidnight, "yyyy-MM-dd");
    expect(correctFormatted).toBe("2026-09-24"); // Never shifts!
  });

  it("should parse yyyy-MM-dd to a local Date matching the same calendar day", () => {
    const dateStr = "2026-09-24";
    const parsed = parseISO(dateStr);

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8); // September is 8 (0-indexed)
    expect(parsed.getDate()).toBe(24);

    expect(format(parsed, "yyyy-MM-dd")).toBe("2026-09-24");
  });
});
