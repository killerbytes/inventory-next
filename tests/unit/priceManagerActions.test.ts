import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  getSession: vi.fn().mockResolvedValue({
    id: 99,
    username: "testadmin",
    name: "Test Admin",
    role: "ADMIN",
  }),
}));

vi.mock("@/server/services", () => ({
  inventoryServerService: {
    getPriceHistory: vi.fn(),
  },
  productCombinationServerService: {
    updatePrices: vi.fn(),
  },
  productServerService: {},
}));

import { revalidatePath } from "next/cache";
import { inventoryServerService, productCombinationServerService } from "@/server/services";
import { getPriceHistoryAction, updateCombinationPriceAction } from "@/server/actions/product.actions";

describe("Price Manager Actions (Unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPriceHistoryAction", () => {
    it("should call inventoryServerService.getPriceHistory with combinationId and return data", async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            productId: 10,
            combinationId: 20,
            fromPrice: "100.00",
            toPrice: "120.00",
            changedBy: 1,
            changedAt: "2026-10-19T00:00:00.000Z",
            user: { id: 1, username: "admin", name: "Admin User", role: "ADMIN" },
          },
        ],
        meta: { total: 1, totalPages: 1, currentPage: 1 },
      };

      vi.mocked(inventoryServerService.getPriceHistory).mockResolvedValue(mockResult as any);

      const res = await getPriceHistoryAction({ combinationId: 20 });

      expect(inventoryServerService.getPriceHistory).toHaveBeenCalledWith({
        combinationId: 20,
      });
      expect(res.data).toHaveLength(1);
      expect(res.data[0].toPrice).toBe("120.00");
    });
  });

  describe("updateCombinationPriceAction", () => {
    it("should validate input, invoke productCombinationServerService.updatePrices, and revalidate paths", async () => {
      vi.mocked(productCombinationServerService.updatePrices).mockResolvedValue(true as any);

      const res = await updateCombinationPriceAction({
        combinationId: 20,
        price: 135.5,
      });

      expect(productCombinationServerService.updatePrices).toHaveBeenCalledWith(
        [{ id: 20, newPrice: 135.5 }],
        99 // user.id from session
      );
      expect(revalidatePath).toHaveBeenCalledWith("/products");
      expect(revalidatePath).toHaveBeenCalledWith("/price-manager");
      expect(res).toBe(true);
    });
  });
});
