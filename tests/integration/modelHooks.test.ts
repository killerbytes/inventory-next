// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { format } from "date-fns";
import { getBarcode, getSKU } from "@/lib/string";
import sequelize from "@/server/db/sequelize";
import {
  Category,
  CombinationValue,
  Customer,
  Inventory,
  Product,
  ProductCombination,
  SalesOrder,
  VariantType,
  VariantValue,
} from "@/server/models";

describe("Sequelize Model Hooks Integration", () => {
  let testCategory: Category;
  let testCustomer: Customer;

  beforeAll(async () => {
    await sequelize.authenticate();
    testCategory = await Category.create({
      name: `Test Cat ${Date.now()}`,
      description: "Test Category for Model Hooks",
      order: 1,
    });
    testCustomer = await Customer.create({
      name: `Test Customer ${Date.now()}`,
      email: `customer_${Date.now()}@example.com`,
    });
  });

  afterAll(async () => {
    if (testCustomer) await testCustomer.destroy({ force: true });
    if (testCategory) await testCategory.destroy({ force: true });
  });

  it("SalesOrder.beforeCreate auto-generates salesOrderNumber with SO-YYYY-MM-XXXX format", async () => {
    const order = await SalesOrder.create({
      customerId: testCustomer.id,
      totalAmount: 150.0,
      status: "DRAFT",
      modeOfPayment: "CASH",
    } as any);

    try {
      expect(order.salesOrderNumber).toBeDefined();
      const currentYearMonth = format(new Date(), "yyyy-MM");
      expect(order.salesOrderNumber).toMatch(
        new RegExp(`^SO-${currentYearMonth}-\\d{4}$`)
      );
    } finally {
      await order.destroy({ force: true });
    }
  });

  it("Product hooks auto-generate and update SKU based on name and categoryId", async () => {
    const product = await Product.create({
      name: "Standard Hammer 16oz",
      categoryId: testCategory.id,
      baseUnit: "PCS",
    });

    try {
      const expectedSku = getSKU("Standard Hammer 16oz", testCategory.id);
      expect(product.sku).toBe(expectedSku);

      // Update product name
      await product.update({ name: "Standard Hammer 20oz" });
      const updatedExpectedSku = getSKU("Standard Hammer 20oz", testCategory.id);
      expect(product.sku).toBe(updatedExpectedSku);
    } finally {
      await product.destroy({ force: true });
    }
  });

  it("ProductCombination.afterCreate auto-generates barcode matching getBarcode(id)", async () => {
    const product = await Product.create({
      name: `Combo Product ${Date.now()}`,
      categoryId: testCategory.id,
      baseUnit: "PCS",
    });

    const combo = await ProductCombination.create({
      productId: product.id,
      name: "Combo Test Unit",
      unit: "PCS",
      price: 99.5,
    });

    try {
      await combo.reload();
      const expectedBarcode = getBarcode(combo.id);
      expect(combo.barcode).toBe(expectedBarcode);
    } finally {
      await combo.destroy({ force: true });
      await product.destroy({ force: true });
    }
  });

  it("ProductCombination.beforeDestroy blocks deletion if inventory quantity > 0", async () => {
    const product = await Product.create({
      name: `Stocked Product ${Date.now()}`,
      categoryId: testCategory.id,
      baseUnit: "PCS",
    });

    const combo = await ProductCombination.create({
      productId: product.id,
      name: "Stocked Combo",
      unit: "PCS",
      price: 50.0,
    });

    await Inventory.create({
      combinationId: combo.id,
      quantity: 15,
      averagePrice: 40.0,
    });

    try {
      await expect(combo.destroy()).rejects.toThrow(/Cannot delete product combination/i);
    } finally {
      // Clean up manually for teardown
      await Inventory.destroy({ where: { combinationId: combo.id }, force: true });
      await combo.destroy({ force: true });
      await product.destroy({ force: true });
    }
  });

  it("VariantValue.beforeDestroy blocks deletion if referencing combination has inventory > 0", async () => {
    const product = await Product.create({
      name: `Variant Stock Product ${Date.now()}`,
      categoryId: testCategory.id,
      baseUnit: "PCS",
    });

    const variantType = await VariantType.create({
      name: "Color",
      productId: product.id,
    });

    const variantValue = await VariantValue.create({
      value: "Ruby Red",
      variantTypeId: variantType.id,
    });

    const combo = await ProductCombination.create({
      productId: product.id,
      name: "Ruby Red Item",
      unit: "PCS",
      price: 75.0,
    });

    await CombinationValue.create({
      combinationId: combo.id,
      variantValueId: variantValue.id,
    });

    await Inventory.create({
      combinationId: combo.id,
      quantity: 25,
      averagePrice: 60.0,
    });

    try {
      await expect(variantValue.destroy()).rejects.toThrow(/Cannot delete variant value/i);
    } finally {
      await Inventory.destroy({ where: { combinationId: combo.id }, force: true });
      await CombinationValue.destroy({
        where: { combinationId: combo.id, variantValueId: variantValue.id },
        force: true,
      });
      await combo.destroy({ force: true });
      await variantValue.destroy({ force: true });
      await variantType.destroy({ force: true });
      await product.destroy({ force: true });
    }
  });

  it("VariantType.beforeDestroy cascades to values and blocks deletion if child value has inventory", async () => {
    const product = await Product.create({
      name: `Type Stock Product ${Date.now()}`,
      categoryId: testCategory.id,
      baseUnit: "PCS",
    });

    const variantType = await VariantType.create({
      name: "Size",
      productId: product.id,
    });

    const variantValue = await VariantValue.create({
      value: "Large",
      variantTypeId: variantType.id,
    });

    const combo = await ProductCombination.create({
      productId: product.id,
      name: "Large Item",
      unit: "PCS",
      price: 120.0,
    });

    await CombinationValue.create({
      combinationId: combo.id,
      variantValueId: variantValue.id,
    });

    await Inventory.create({
      combinationId: combo.id,
      quantity: 50,
      averagePrice: 100.0,
    });

    try {
      await expect(variantType.destroy()).rejects.toThrow(/Cannot delete variant value/i);
    } finally {
      await Inventory.destroy({ where: { combinationId: combo.id }, force: true });
      await CombinationValue.destroy({
        where: { combinationId: combo.id, variantValueId: variantValue.id },
        force: true,
      });
      await combo.destroy({ force: true });
      await variantValue.destroy({ force: true });
      await variantType.destroy({ force: true });
      await product.destroy({ force: true });
    }
  });
});
