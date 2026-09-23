import { ProductCombination } from "@/server/models";
import { productServerService } from "@/server/services/productServer.service";
import { resetDatabase, setupDatabase } from "../setup";
import {
  categories,
  createCategory,
  createCombination,
  createVariantType,
  getConstraintFields,
  products,
} from "../utils/fixtures";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  await createCategory(0);
  await createCategory(1);
});

describe("Product Service (Integration)", () => {
  it("should create and fetch product", async () => {
    const created: any = await productServerService.create(products[0]);
    const product: any = await productServerService.get(created.id);

    expect(product).not.toBeNull();
    expect(product.name).toBe(products[0].name);
    expect(product.description).toBe(products[0].description);
    expect(product.baseUnit).toBe(products[0].baseUnit);
  });

  it("should update product", async () => {
    const created: any = await productServerService.create(products[0]);

    await createVariantType(0);
    await createCombination();

    const updated: any = await productServerService.update(created.id, {
      name: "Wood Shovel",
      description: "Shovel Updated",
      baseUnit: "BOX",
      categoryId: 1,
    });

    const productCombination = await ProductCombination.findAll({
      where: {
        productId: updated.id,
      },
    });

    expect(updated).not.toBeNull();
    expect(updated.name).toBe("Wood Shovel");
    expect(updated.description).toBe("Shovel Updated");
    expect(updated.baseUnit).toBe("BOX");
    expect(productCombination.length).toBe(2);
    expect(productCombination[0].name).toBe("Wood Shovel - Red");
    expect(productCombination[0].sku).toBe("01-WOOSHO-BOX-RED");
    expect(productCombination[1].name).toBe("Wood Shovel - Red");
    expect(productCombination[1].sku).toBe("01-WOOSHO-PCS-RED");
  });

  it("should list all products", async () => {
    await productServerService.create(products[0]);
    await productServerService.create(products[1]);

    const prods = await productServerService.getAll();

    expect(prods).not.toBeNull();
    expect(prods.length).toBe(2);
  });

  it("should delete product", async () => {
    const created: any = await productServerService.create(products[0]);
    const deleted: any = await productServerService.delete(created.id);

    expect(deleted.success).toBe(true);
    const fetched = await productServerService.get(created.id);
    expect(fetched).toBeNull();
  });

  it("should enforce unique name and unit constraint", async () => {
    await productServerService.create(products[0]);

    try {
      await productServerService.create({
        ...products[0],
      });
      throw new Error(
        "Expected SequelizeUniqueConstraintError but no error was thrown"
      );
    } catch (err: any) {
      expect(err.name).toBe("SequelizeUniqueConstraintError");
      expect(getConstraintFields(err)).toContain("name");
      expect(getConstraintFields(err)).toEqual(
        expect.arrayContaining(["name", "baseUnit"])
      );
    }
  });

  it("should fetch all products by sku", async () => {
    await productServerService.create(products[0]);
    await productServerService.create(products[1]);
    const prods = await productServerService.getAllBySku("01-SHO");
    expect(prods.length).toBe(1);
    expect(prods[0].name).toBe(products[0].name);
  });

  it("should update a product's unit", async () => {
    const create: any = await productServerService.create(products[0]);

    const product: any = await productServerService.get(create.id);
    const updated: any = await productServerService.update(product.id, {
      name: product.name,
      categoryId: product.categoryId,
      baseUnit: "BOX",
    });
    expect(updated.baseUnit).toBe("BOX");
  });

  it("should get a paginated list of products", async () => {
    await productServerService.create(products[0]);
    await productServerService.create(products[1]);

    const prods: any = await productServerService.getPaginated({
      page: 1,
      limit: 1,
    } as any);

    expect(prods.data.length).toBe(2);
    expect(prods.data[0].categoryName).toBe(categories[0].name);
    expect(prods.data[0].products[0].name).toBe(products[0].name);
    expect(prods.data[1].categoryName).toBe(categories[1].name);
    expect(prods.data[1].products[0].name).toBe(products[1].name);
  });
});
