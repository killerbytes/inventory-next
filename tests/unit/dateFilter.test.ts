import { describe, expect, it } from "vitest";
import { Op } from "sequelize";
import { buildDateFilter } from "@/server/services";

describe("buildDateFilter (Unit)", () => {
  it("should return undefined when neither startDate nor endDate is provided", () => {
    // Arrange & Act
    const resUndefined = buildDateFilter(undefined, undefined);
    const resNull = buildDateFilter(null, null);
    const resEmpty = buildDateFilter("", "");

    // Assert
    expect(resUndefined).toBeUndefined();
    expect(resNull).toBeUndefined();
    expect(resEmpty).toBeUndefined();
  });

  it("should generate Op.gte with start-of-day converted to UTC for Asia/Manila", () => {
    // Arrange: "2026-07-01" in Asia/Manila (UTC+8) midnight is 2026-06-30 16:00:00.000Z
    const startDate = "2026-07-01";

    // Act
    const filter = buildDateFilter(startDate, undefined);

    // Assert
    expect(filter).toBeDefined();
    expect(filter![Op.gte]).toBeInstanceOf(Date);
    expect(filter![Op.gte]?.toISOString()).toBe("2026-06-30T16:00:00.000Z");
    expect(filter![Op.lte]).toBeUndefined();
  });

  it("should generate Op.lte with end-of-day converted to UTC for Asia/Manila", () => {
    // Arrange: "2026-07-31" in Asia/Manila (UTC+8) 23:59:59.999 is 2026-07-31 15:59:59.999Z
    const endDate = "2026-07-31";

    // Act
    const filter = buildDateFilter(undefined, endDate);

    // Assert
    expect(filter).toBeDefined();
    expect(filter![Op.lte]).toBeInstanceOf(Date);
    expect(filter![Op.lte]?.toISOString()).toBe("2026-07-31T15:59:59.999Z");
    expect(filter![Op.gte]).toBeUndefined();
  });

  it("should handle both startDate and endDate simultaneously", () => {
    // Arrange
    const startDate = "2026-07-01";
    const endDate = "2026-07-31";

    // Act
    const filter = buildDateFilter(startDate, endDate);

    // Assert
    expect(filter).toBeDefined();
    expect(filter![Op.gte]?.toISOString()).toBe("2026-06-30T16:00:00.000Z");
    expect(filter![Op.lte]?.toISOString()).toBe("2026-07-31T15:59:59.999Z");
  });

  it("should accept Date objects as input and convert properly", () => {
    // Arrange: Date representing 2026-07-01 10:00:00 Asia/Manila (02:00:00Z)
    const startDateObj = new Date("2026-07-01T02:00:00.000Z");
    const endDateObj = new Date("2026-07-31T05:00:00.000Z");

    // Act
    const filter = buildDateFilter(startDateObj, endDateObj);

    // Assert
    expect(filter).toBeDefined();
    expect(filter![Op.gte]?.toISOString()).toBe("2026-06-30T16:00:00.000Z");
    expect(filter![Op.lte]?.toISOString()).toBe("2026-07-31T15:59:59.999Z");
  });

  it("should respect custom timezone override", () => {
    // Arrange: In UTC, start of 2026-07-01 is 2026-07-01T00:00:00.000Z
    const startDate = "2026-07-01";

    // Act
    const filter = buildDateFilter(startDate, undefined, "UTC");

    // Assert
    expect(filter).toBeDefined();
    expect(filter![Op.gte]?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });
});
