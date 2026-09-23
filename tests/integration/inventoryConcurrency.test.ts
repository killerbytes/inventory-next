import { Inventory } from "@/server/models";
import { productCombinationServerService } from "@/server/services/productCombinationServer.service";
import { salesServerService } from "@/server/services/salesServer.service";
import { resetDatabase, setupDatabase } from "../setup";
import {
  createCategory,
  createCombination,
  createCustomer,
  createProduct,
  createUser,
  createVariantType,
} from "../utils/fixtures";

describe("Inventory Concurrency (Integration)", () => {
  let user0: any;
  let customer0: any;
  let product0: any;
  let combination1: any;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    user0 = await createUser(0);
    customer0 = await createCustomer(0);
    await createCategory(0);
    product0 = await createProduct(0);

    const variantType = await createVariantType(0);

    await createCombination(
      [
        {
          name: "Test Combo",
          price: 100,
          unit: "PCS",
          values: [{ value: "Red", variantTypeId: variantType.id }],
          reorderLevel: 1,
          conversionFactor: 1,
        },
      ],
      product0.id
    );

    const combinations = await productCombinationServerService.getByProductId(
      product0.id
    );
    combination1 = combinations.combinations[0];

    // Stock up with exactly 1 item
    await productCombinationServerService.stockAdjustment({
      combinationId: combination1.id,
      newQuantity: 1,
      reason: "OTHER",
      notes: "Setup",
    } as any);
  });

  it("should prevent selling more than available stock during concurrent requests", async () => {
    const createOrderParams = {
      customerId: customer0.id,
      status: "RECEIVED",
      orderDate: new Date(),
      salesOrderItems: [
        {
          combinationId: combination1.id,
          quantity: 1,
          originalPrice: 100,
          purchasePrice: 100,
        },
      ],
      modeOfPayment: "CASH",
    };

    const p1 = salesServerService.create({
      ...createOrderParams,
      salesOrderNumber: "SO-CONC-1",
    } as any, user0.id);

    const p2 = salesServerService.create({
      ...createOrderParams,
      salesOrderNumber: "SO-CONC-2",
    } as any, user0.id);

    const results = await Promise.allSettled([p1, p2]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    const inventory = await Inventory.findOne({
      where: { combinationId: combination1.id },
    });

    expect(Number(inventory?.quantity)).toBeGreaterThanOrEqual(0);

    if (fulfilled.length === 1) {
      expect(Number(inventory?.quantity)).toBe(0);
    }

    expect(fulfilled.length).toBeLessThan(2);
  });
});
