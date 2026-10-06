import { describe, expect, it, vi, beforeEach } from "vitest";
import { getMappedSearchProductCombinations } from "@/lib/api-clients/productSearch";
import { searchProductCombinationsAction } from "@/server/actions/product.actions";

vi.mock("@/server/actions/product.actions", () => ({
  searchProductCombinationsAction: vi.fn(),
}));

describe("getMappedSearchProductCombinations (Unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return an empty array if query has fewer than 2 characters", async () => {
    // Arrange & Act
    const resultEmpty = await getMappedSearchProductCombinations({ search: "" });
    const resultSingle = await getMappedSearchProductCombinations({ search: "a" });

    // Assert
    expect(resultEmpty).toEqual([]);
    expect(resultSingle).toEqual([]);
    expect(searchProductCombinationsAction).not.toHaveBeenCalled();
  });

  it("should flatten combinations and attach product details", async () => {
    // Arrange
    const mockApiResponse = [
      {
        id: 1,
        name: "Steel Pipe",
        description: "Heavy structural pipe",
        categoryId: 5,
        combinations: [
          {
            id: 101,
            productId: 1,
            name: "Steel Pipe - 2 inch",
            unit: "PCS",
            price: 150,
            inventory: { quantity: 10, averagePrice: 120 },
          },
          {
            id: 102,
            productId: 1,
            name: "Steel Pipe - 4 inch",
            unit: "PCS",
            price: 300,
            inventory: { quantity: 5, averagePrice: 250 },
          },
        ],
      },
    ];

    vi.mocked(searchProductCombinationsAction).mockResolvedValue(mockApiResponse as any);

    // Act
    const results = await getMappedSearchProductCombinations({ search: "pipe" });

    // Assert
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe(101);
    expect(results[0].product).toBeDefined();
    expect(results[0].product.categoryId).toBe(5);
    expect(results[1].id).toBe(102);
  });

  it("should append description tag when product description matches query tokens", async () => {
    // Arrange
    const mockApiResponse = [
      {
        id: 2,
        name: "Shovel",
        description: "heavy duty steel garden shovel",
        categoryId: 3,
        combinations: [
          {
            id: 201,
            productId: 2,
            name: "Shovel - Red",
            unit: "PCS",
            price: 250,
            inventory: { quantity: 8, averagePrice: 180 },
          },
        ],
      },
    ];

    vi.mocked(searchProductCombinationsAction).mockResolvedValue(mockApiResponse as any);

    // Act
    const results = await getMappedSearchProductCombinations({ search: "garden" });

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0].name).toContain("***heavy duty steel garden shovel***");
    expect(results[0].product.id).toBe(2);
  });

  it("should match multi-word queries across name and description", async () => {
    // Arrange
    const mockApiResponse = [
      {
        id: 3,
        name: "Cement",
        description: "Portland Type 1",
        categoryId: 8,
        combinations: [
          {
            id: 301,
            productId: 3,
            name: "Cement 40kg Bag",
            unit: "BAG",
            price: 240,
            inventory: { quantity: 100, averagePrice: 200 },
          },
        ],
      },
    ];

    vi.mocked(searchProductCombinationsAction).mockResolvedValue(mockApiResponse as any);

    // Act
    const results = await getMappedSearchProductCombinations({ search: "cement portland" });

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(301);
  });
});
