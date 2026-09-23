import { variantTypeServerService } from "@/server/services/variantTypeServer.service";
import { resetDatabase, setupDatabase } from "../setup";
import { createCategory, createProduct } from "../utils/fixtures";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  await createCategory(0);
  await createCategory(1);
  await createProduct(0);
  await createProduct(1);
});

describe("Variant Type Service (Integration)", () => {
  it("should create and fetch a variant type", async () => {
    const created: any = await variantTypeServerService.create({
      name: "Test Variant Type",
      productId: 1,
      values: [{ value: "TEST1" }, { value: "TEST2" }],
    });

    const variantTypes: any = await variantTypeServerService.getByProductId(
      created.productId
    );

    expect(variantTypes[0]).not.toBeNull();
    expect(variantTypes[0].name).toBe("Test Variant Type");
    expect(variantTypes[0].values.length).toBe(2);
  });

  it("should list all variant types", async () => {
    await variantTypeServerService.create({
      name: "Test Variant Type",
      productId: 1,
      isTemplate: true,
      values: [{ value: "TEST1" }, { value: "TEST2" }],
    });
    await variantTypeServerService.create({
      name: "Test Variant Type 2",
      productId: 2,
      isTemplate: true,
      values: [{ value: "TEST1" }, { value: "TEST2" }],
    });

    const allTypes: any = await variantTypeServerService.getAll();
    expect(allTypes.length).toBe(2);
  });

  it("should update a variant type", async () => {
    const created: any = await variantTypeServerService.create({
      name: "Test Variant Type",
      productId: 1,
      values: [{ value: "TEST1" }, { value: "TEST2" }],
    });

    const updated: any = await variantTypeServerService.update(created.id, {
      name: "Updated Test Variant Type",
      values: [{ value: "TEST1" }, { value: "TEST2" }, { value: "TEST3" }],
    });

    expect(updated.name).toBe("Updated Test Variant Type");
    expect(updated.values.length).toBe(3);
  });

  it("should delete a variant type", async () => {
    const created: any = await variantTypeServerService.create({
      name: "Test Variant Type",
      productId: 1,
      values: [{ value: "TEST1" }, { value: "TEST2" }],
    });

    const deleted = await variantTypeServerService.delete(created.id);
    expect(deleted.success).toBe(true);

    const remaining: any = await variantTypeServerService.getByProductId(
      created.productId
    );
    expect(remaining.length).toBe(0);
  });
});
