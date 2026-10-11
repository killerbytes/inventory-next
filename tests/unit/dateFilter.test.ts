import { describe, expect, it } from "vitest";
import { getDateBounds } from "@/server/services";

describe("getDateBounds (Unit)", () => {
  it("should return undefined bounds when neither startDate nor endDate is provided", () => {
    // Arrange & Act
    const resUndefined = getDateBounds(undefined, undefined);
    const resNull = getDateBounds(null, null);
    const resEmpty = getDateBounds("", "");

    // Assert
    expect(resUndefined.startBound).toBeUndefined();
    expect(resUndefined.endBound).toBeUndefined();
    expect(resNull.startBound).toBeUndefined();
    expect(resNull.endBound).toBeUndefined();
    expect(resEmpty.startBound).toBeUndefined();
    expect(resEmpty.endBound).toBeUndefined();
  });

  it("should generate startBound with start-of-day converted to UTC for Asia/Manila", () => {
    // Arrange: "2026-07-01" in Asia/Manila (UTC+8) midnight is 2026-06-30 16:00:00.000Z
    const startDate = "2026-07-01";

    // Act
    const bounds = getDateBounds(startDate, undefined);

    // Assert
    expect(bounds.startBound).toBeDefined();
    expect(bounds.startBound).toBeInstanceOf(Date);
    expect(bounds.startBound?.toISOString()).toBe("2026-06-30T16:00:00.000Z");
    expect(bounds.endBound).toBeUndefined();
  });

  it("should generate endBound with end-of-day converted to UTC for Asia/Manila", () => {
    // Arrange: "2026-07-31" in Asia/Manila (UTC+8) 23:59:59.999 is 2026-07-31 15:59:59.999Z
    const endDate = "2026-07-31";

    // Act
    const bounds = getDateBounds(undefined, endDate);

    // Assert
    expect(bounds.endBound).toBeDefined();
    expect(bounds.endBound).toBeInstanceOf(Date);
    expect(bounds.endBound?.toISOString()).toBe("2026-07-31T15:59:59.999Z");
    expect(bounds.startBound).toBeUndefined();
  });

  it("should handle both startDate and endDate simultaneously", () => {
    // Arrange
    const startDate = "2026-07-01";
    const endDate = "2026-07-31";

    // Act
    const bounds = getDateBounds(startDate, endDate);

    // Assert
    expect(bounds.startBound).toBeDefined();
    expect(bounds.startBound?.toISOString()).toBe("2026-06-30T16:00:00.000Z");
    expect(bounds.endBound?.toISOString()).toBe("2026-07-31T15:59:59.999Z");
  });

  it("should accept Date objects as input and convert properly", () => {
    // Arrange: Date representing 2026-07-01 10:00:00 Asia/Manila (02:00:00Z)
    const startDateObj = new Date("2026-07-01T02:00:00.000Z");
    const endDateObj = new Date("2026-07-31T05:00:00.000Z");

    // Act
    const bounds = getDateBounds(startDateObj, endDateObj);

    // Assert
    expect(bounds.startBound).toBeDefined();
    expect(bounds.startBound?.toISOString()).toBe("2026-06-30T16:00:00.000Z");
    expect(bounds.endBound?.toISOString()).toBe("2026-07-31T15:59:59.999Z");
  });

  it("should respect custom timezone override", () => {
    // Arrange: In UTC, start of 2026-07-01 is 2026-07-01T00:00:00.000Z
    const startDate = "2026-07-01";

    // Act
    const bounds = getDateBounds(startDate, undefined, "UTC");

    // Assert
    expect(bounds.startBound).toBeDefined();
    expect(bounds.startBound?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });
});

