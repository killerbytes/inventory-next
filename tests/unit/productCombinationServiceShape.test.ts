import { describe, expect, it } from "vitest";
import {
  buildTsQuery,
  productCombinationServerService,
} from "@/server/services/productCombinationServer.service";

describe("productCombinationServerService Contract & Shape (Unit)", () => {
  it("should not expose pruned dead methods or redundant aliases", () => {
    const service = productCombinationServerService as Record<string, unknown>;
    expect(service.get).toBeUndefined();
    expect(service.buildTsQuery).toBeUndefined();
  });

  it("should expose all active domain methods", () => {
    const service = productCombinationServerService as Record<string, unknown>;
    expect(typeof service.getByProductId).toBe("function");
    expect(typeof service.getByBarcode).toBe("function");
    expect(typeof service.getByCategoryId).toBe("function");
    expect(typeof service.updateByProductId).toBe("function");
    expect(typeof service.search).toBe("function");
    expect(typeof service.searchSuggestion).toBe("function");
    expect(typeof service.breakPack).toBe("function");
    expect(typeof service.stockAdjustment).toBe("function");
    expect(typeof service.getByIds).toBe("function");
    expect(typeof service.updatePrices).toBe("function");
  });

  it("should preserve the standalone buildTsQuery export", () => {
    expect(typeof buildTsQuery).toBe("function");
    expect(buildTsQuery("test query")).toBe("test:* & query:*");
  });
});

