// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { format } from "date-fns";
import { getBarcode, getSKU } from "@/lib/string";
import {
  productCombinationServerService,
  productServerService,
  salesServerService,
} from "@/server/services";
import { resetDatabase, setupDatabase } from "../setup";
import {
  createCategory,
  createCustomer,
  createUser,
} from "../utils/fixtures";

describe("Domain Business Rules Integration", () => {
  let testCategory: any;
  let testCustomer: any;
  let testUser: any;

  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    testUser = await createUser(0);
    testCategory = await createCategory(0);
    testCustomer = await createCustomer(0);
  });

  it("salesServerService.create auto-generates salesOrderNumber with SO-YYYY-MM-XXXX format", async () => {
    const order = await salesServerService.create(
      {
        customerId: testCustomer.id,
        status: "DRAFT",
        modeOfPayment: "CASH",
        salesOrderItems: [],
      } as any,
      testUser.id,
    );

    expect(order?.salesOrderNumber).toBeDefined();
    const currentYearMonth = format(new Date(), "yyyy-MM");
    expect(order?.salesOrderNumber).toMatch(
      new RegExp(`^SO-${currentYearMonth}-\\d{4}$`),
    );
  });

  it("productServerService auto-generates and updates SKU based on name and categoryId", async () => {
    const product = await productServerService.create({
      name: "Standard Hammer 16oz",
      categoryId: testCategory.id,
      baseUnit: "PCS",
    });

    const expectedSku = getSKU("Standard Hammer 16oz", testCategory.id);
    expect(product.sku).toBe(expectedSku);

    // Update product name
    const updated = await productServerService.update(product.id, {
      name: "Standard Hammer 20oz",
    });
    const updatedExpectedSku = getSKU("Standard Hammer 20oz", testCategory.id);
    expect(updated.sku).toBe(updatedExpectedSku);
  });

  it("productCombinationServerService auto-generates barcode matching getBarcode(id)", async () => {
    const product = await productServerService.create({
      name: `Combo Product ${Date.now()}`,
      categoryId: testCategory.id,
      baseUnit: "PCS",
    });

    await productCombinationServerService.updateByProductId(
      product.id,
      [
        {
          productId: product.id,
          name: "Combo Test Unit",
          unit: "PCS",
          price: 99.5,
          values: [],
        },
      ],
      testUser.id,
    );

    const combos = await productCombinationServerService.getByProductId(product.id);
    const combo = combos.combinations[0];
    const expectedBarcode = getBarcode(combo.id);
    expect(combo.barcode).toBe(expectedBarcode);
  });

  it("productCombinationServerService blocks deletion if inventory quantity > 0", async () => {
    const product = await productServerService.create({
      name: `Stocked Product ${Date.now()}`,
      categoryId: testCategory.id,
      baseUnit: "PCS",
    });

    await productCombinationServerService.updateByProductId(
      product.id,
      [
        {
          productId: product.id,
          name: "Stocked Combo",
          unit: "PCS",
          price: 50.0,
          values: [],
        },
      ],
      testUser.id,
    );

    const combos = await productCombinationServerService.getByProductId(product.id);
    const combo = combos.combinations[0];

    // Add inventory to combo
    await productCombinationServerService.stockAdjustment(
      {
        combinationId: combo.id,
        newQuantity: 15,
        reason: "FOUND",
        notes: "Stocked up",
      } as any,
      testUser.id,
    );

    // Attempting to delete combo by passing empty combinations list must reject
    await expect(
      productCombinationServerService.updateByProductId(
        product.id,
        [],
        testUser.id,
      ),
    ).rejects.toThrow(/Cannot delete combinations with inventory > 0/i);
  });
});
