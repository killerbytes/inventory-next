import { getSKU } from "@/lib/string";
import { PriceHistory, ProductCombination } from "@/server/models";
import { goodReceiptServerService } from "@/server/services/goodReceiptServer.service";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { productServerService } from "@/server/services/productServer.service";
import { variantTypeServerService } from "@/server/services/variantTypeServer.service";
import { resetDatabase, setupDatabase } from "../setup";
import {
  combinations,
  createCategory,
  createCombination,
  createProduct,
  createSupplier,
  createUser,
  createVariantType,
} from "../utils/fixtures";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  await createUser(0);
  await createUser(1);
  await createCategory(0);
  await createCategory(1);
  await createProduct(0);
  await createProduct(1);
  await createVariantType(0);
  await createSupplier(0);
  await createCombination();
});

describe("Product Combination Service (Integration)", () => {
  it("should create and fetch a product combination", async () => {
    await productCombinationServerService.updateByProductId(1, combinations as any);
    const combo: any = await productCombinationServerService.getByProductId(1);
    const product: any = await productServerService.get(1);
    const sku = getSKU(
      product.name,
      product.categoryId,
      combo.combinations[0].unit,
      combo.combinations[0].values
    );

    expect(combo.combinations[0]).not.toBeNull();
    expect(combo.combinations[0].name).toBe("Shovel - Red");
    expect(combo.combinations[0].sku).toBe(sku);
    expect(combo.combinations[0].unit).toBe("BOX");
    expect(Number(combo.combinations[0].price)).toBe(100);
    expect(combo.combinations[0].reorderLevel).toBe(1);
    expect(Number(combo.combinations[0].inventory.quantity)).toBe(0);
    expect(combo.variants).not.toBeNull();
    expect(combo.variants[0].name).toBe("Colors");
    expect(combo.variants[0].values[0].value).toBe("Blue");
    expect(combo.variants[0].values[1].value).toBe("Red");
    expect(combo.variants[0].values.length).toBe(2);
    expect(combo.variants[0].values[0].variantTypeId).toBe(1);
    expect(combo.variants[0].values[1].variantTypeId).toBe(1);
    expect(combo.variants[0].productId).toBe(1);
  });

  it("should update price and create price history", async () => {
    const { combinations: currentCombos }: any =
      await productCombinationServerService.getByProductId(1);

    await productCombinationServerService.updateByProductId(
      1,
      currentCombos.map((c: any) => ({
        ...c.dataValues,
        price: 123,
      }))
    );

    const combo: any = await productCombinationServerService.getByProductId(1);
    expect(Number(combo.combinations[0].price)).toBe(123);
    expect(Number(combo.combinations[1].price)).toBe(123);

    const priceHistories = await PriceHistory.findAll();
    expect(priceHistories.length).toBe(2);
    expect(Number(priceHistories[0].fromPrice)).toBe(100);
    expect(Number(priceHistories[0].toPrice)).toBe(123);
    expect(Number(priceHistories[1].fromPrice)).toBe(100);
    expect(Number(priceHistories[1].toPrice)).toBe(123);
  });

  it("should make a stock adjustment", async () => {
    await productCombinationServerService.updateByProductId(1, combinations as any);
    const initialCombo: any =
      await productCombinationServerService.getByProductId(1);
    const targetCombinationId = initialCombo.combinations[0].id;

    await productCombinationServerService.stockAdjustment(
      {
        combinationId: targetCombinationId,
        newQuantity: 10,
        reason: "EXPIRED",
        notes: "test",
      } as any,
      1
    );

    const combo: any = await productCombinationServerService.getByProductId(1);
    expect(Number(combo.combinations[0].inventory.quantity)).toBe(10);

    await productCombinationServerService.stockAdjustment(
      {
        combinationId: targetCombinationId,
        newQuantity: 11,
        reason: "EXPIRED",
        notes: "test",
      } as any,
      1
    );

    const combo2: any = await productCombinationServerService.getByProductId(1);
    expect(Number(combo2.combinations[0].inventory.quantity)).toBe(11);
  });

  describe("Break/Repack Operations", () => {
    beforeEach(async () => {
      await goodReceiptServerService.create(
        {
          supplierId: 1,
          receiptDate: new Date(),
          referenceNo: "Test Notes",
          internalNotes: "Test Internal Notes",
          goodReceiptLines: [
            {
              combinationId: 1,
              quantity: 1,
              purchasePrice: 100,
            },
          ],
        },
        1
      );

      await goodReceiptServerService.update(
        1,
        {
          status: "RECEIVED",
          goodReceiptLines: [
            {
              combinationId: 1,
              quantity: 2,
              purchasePrice: 100,
            },
          ],
        },
        1
      );

      await productCombinationServerService.updateByProductId(1, [
        {
          id: 1,
          conversionFactor: 100,
          unit: "BOX",
          price: 100,
          reorderLevel: 10,
          values: [
            {
              value: "Red",
              variantTypeId: 1,
            },
          ],
        },
        {
          id: 2,
          conversionFactor: 1,
          unit: "PCS",
          price: 5,
          reorderLevel: 10,
          isBreakPackOfId: 1,
          values: [
            {
              value: "Red",
              variantTypeId: 1,
            },
          ],
        },
      ] as any);
    });

    it("should break pack from BOX to PCS", async () => {
      await productCombinationServerService.breakPack(
        {
          fromCombinationId: 1,
          quantity: 1,
          toCombinationId: 2,
        },
        1
      );

      const combo: any = await productCombinationServerService.getByProductId(1);
      expect(combo.combinations[0].unit).toBe("BOX");
      expect(Number(combo.combinations[0].inventory.quantity)).toBe(1);

      expect(combo.combinations[1].unit).toBe("PCS");
      expect(Number(combo.combinations[1].inventory.quantity)).toBe(100);
    });

    it("should only allow whole number quantity", async () => {
      try {
        await productCombinationServerService.breakPack(
          {
            fromCombinationId: 1,
            quantity: 1.5,
            toCombinationId: 2,
          },
          1
        );
        throw new Error("Expected error but no error was thrown");
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Quantity must be a whole number");
      }
    });

    it("should handle sequential break pack operations", async () => {
      await productCombinationServerService.breakPack(
        {
          fromCombinationId: 1,
          quantity: 1,
          toCombinationId: 2,
        },
        1
      );

      await productCombinationServerService.breakPack(
        {
          fromCombinationId: 1,
          quantity: 1,
          toCombinationId: 2,
        },
        1
      );

      const combo: any = await productCombinationServerService.getByProductId(1);
      expect(Number(combo.combinations[0].inventory.quantity)).toBe(0);
      expect(Number(combo.combinations[1].inventory.quantity)).toBe(200);
    });

    it("should repack from PCS to BOX", async () => {
      await productCombinationServerService.breakPack(
        {
          fromCombinationId: 1,
          quantity: 2,
          toCombinationId: 2,
        },
        1
      );

      await productCombinationServerService.breakPack(
        {
          fromCombinationId: 2,
          quantity: 100,
          toCombinationId: 1,
        },
        1
      );

      const combo: any = await productCombinationServerService.getByProductId(1);
      expect(Number(combo.combinations[0].inventory.quantity)).toBe(1);
      expect(Number(combo.combinations[1].inventory.quantity)).toBe(100);
    });

    it("should handle multiple repack operations", async () => {
      await productCombinationServerService.breakPack(
        {
          fromCombinationId: 1,
          quantity: 2,
          toCombinationId: 2,
        },
        1
      );

      await productCombinationServerService.breakPack(
        {
          fromCombinationId: 2,
          quantity: 100,
          toCombinationId: 1,
        },
        1
      );

      await productCombinationServerService.breakPack(
        {
          fromCombinationId: 2,
          quantity: 100,
          toCombinationId: 1,
        },
        1
      );

      const combo: any = await productCombinationServerService.getByProductId(1);
      expect(Number(combo.combinations[0].inventory.quantity)).toBe(2);
      expect(Number(combo.combinations[1].inventory.quantity)).toBe(0);
    });
  });

  it("should re pack a product combination to another unit", async () => {
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: 1,
        newQuantity: 0,
        reason: "EXPIRED",
        notes: "test",
      } as any,
      1
    );

    await productCombinationServerService.stockAdjustment(
      {
        combinationId: 2,
        newQuantity: 24,
        reason: "EXPIRED",
        notes: "test",
      } as any,
      1
    );

    await productCombinationServerService.breakPack(
      {
        fromCombinationId: 2,
        quantity: 24,
        toCombinationId: 1,
      },
      1
    );

    const combo: any = await productCombinationServerService.getByProductId(1);
    expect(combo.combinations[0].unit).toBe("BOX");
    expect(Number(combo.combinations[0].inventory.quantity)).toBe(1);
    expect(combo.combinations[1].unit).toBe("PCS");
    expect(Number(combo.combinations[1].inventory.quantity)).toBe(0);

    await productCombinationServerService.breakPack(
      {
        fromCombinationId: 1,
        quantity: 1,
        toCombinationId: 2,
      },
      1
    );

    const combo2: any = await productCombinationServerService.getByProductId(1);
    expect(combo2.combinations[0].unit).toBe("BOX");
    expect(Number(combo2.combinations[0].inventory.quantity)).toBe(0);
    expect(combo2.combinations[1].unit).toBe("PCS");
    expect(Number(combo2.combinations[1].inventory.quantity)).toBe(24);
  });

  it("should throw error if inventory is not enough", async () => {
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: 1,
        newQuantity: 10,
        reason: "EXPIRED",
        notes: "test",
      } as any,
      1
    );

    try {
      await productCombinationServerService.breakPack(
        {
          fromCombinationId: 1,
          quantity: 11,
          toCombinationId: 2,
        },
        1
      );
      throw new Error("Expected error but no error was thrown");
    } catch (err: any) {
      expect(err.name).toBe("Error");
      expect(err.message).toBe("Not enough inventory");
    }
  });

  it("should throw error if different product", async () => {
    await variantTypeServerService.create({
      name: "Size",
      productId: 2,
      values: [{ value: "Blue" }],
    });

    await productCombinationServerService.updateByProductId(2, [
      {
        unit: "BOX",
        price: 100,
        reorderLevel: 1,
        conversionFactor: 24,
        values: [{ variantTypeId: 2, value: "Blue" }],
      },
    ] as any);

    await productCombinationServerService.stockAdjustment(
      {
        combinationId: 1,
        newQuantity: 10,
        reason: "EXPIRED",
        notes: "test",
      } as any,
      1
    );

    try {
      await productCombinationServerService.breakPack(
        {
          fromCombinationId: 1,
          quantity: 11,
          toCombinationId: 3,
        },
        1
      );
      throw new Error("Expected error but no error was thrown");
    } catch (err: any) {
      expect(err.name).toBe("Error");
      expect(err.message).toBe("Cannot convert between different products");
    }
  });

  describe("updatePrices", () => {
    it("should update multiple prices and create price history within a transaction", async () => {
      const { combinations: currentCombos }: any =
        await productCombinationServerService.getByProductId(1);
      const list = [
        { id: currentCombos[0].id, newPrice: 150.5 },
        { id: currentCombos[1].id, newPrice: 10.99 },
      ];

      const result = await productCombinationServerService.updatePrices(list, 1);
      expect(result).toBe(true);

      const combo: any = await productCombinationServerService.getByProductId(1);
      const updatedCombo1 = combo.combinations.find(
        (c: any) => c.id === currentCombos[0].id
      );
      const updatedCombo2 = combo.combinations.find(
        (c: any) => c.id === currentCombos[1].id
      );

      expect(Number(updatedCombo1.price)).toBe(150.5);
      expect(Number(updatedCombo2.price)).toBe(10.99);

      const priceHistories = await PriceHistory.findAll({
        where: {
          combinationId: [currentCombos[0].id, currentCombos[1].id],
        },
        order: [["id", "DESC"]],
      });

      const history1 = priceHistories.find(
        (h: any) =>
          h.combinationId === currentCombos[0].id && Number(h.toPrice) === 150.5
      );
      const history2 = priceHistories.find(
        (h: any) =>
          h.combinationId === currentCombos[1].id && Number(h.toPrice) === 10.99
      );

      expect(history1).toBeDefined();
      expect(history2).toBeDefined();

      expect(Number(history1?.fromPrice)).toBe(Number(currentCombos[0].price));
      expect(Number(history2?.fromPrice)).toBe(Number(currentCombos[1].price));
    });

    it("should rollback transaction and throw error if a combination is not found", async () => {
      const { combinations: currentCombos }: any =
        await productCombinationServerService.getByProductId(1);
      const initialPrice = Number(currentCombos[0].price);

      const list = [
        { id: currentCombos[0].id, newPrice: 999.99 },
        { id: 99999, newPrice: 50.0 }, // Invalid id
      ];

      await expect(
        productCombinationServerService.updatePrices(list, 1)
      ).rejects.toThrow("combo not found");

      // Verify rollback
      const combo: any = await productCombinationServerService.getByProductId(1);
      const unchangedCombo1 = combo.combinations.find(
        (c: any) => c.id === currentCombos[0].id
      );
      expect(Number(unchangedCombo1.price)).toBe(initialPrice);

      const histories = await PriceHistory.findAll({
        where: { combinationId: currentCombos[0].id, toPrice: 999.99 },
      });
      expect(histories.length).toBe(0);
    });
  });
});
