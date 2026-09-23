import { categoryServerService } from "@/server/services/categoryServer.service";
import { resetDatabase, setupDatabase } from "../setup";
import { categories, createCategory, getConstraintFields } from "../utils/fixtures";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  await createCategory(0);
  await createCategory(1);
});

describe("Category Service (Integration)", () => {
  it("should create and fetch a category", async () => {
    const cat = await categoryServerService.create({
      name: "Primary",
    });
    const category: any = await categoryServerService.get(cat.id);

    expect(category).not.toBeNull();
    expect(category.name).toBe("Primary");
    expect(category.description).toBeNull();
    expect(category.order).toBeNull();
  });

  it("should list all categories", async () => {
    const allCategories = await categoryServerService.getAll();
    expect(allCategories.length).toBe(2);
  });

  it("should update a category", async () => {
    const category = await categoryServerService.create({
      name: "Primary",
    });
    const updated: any = await categoryServerService.update(category.id, {
      name: "Tools updated",
      description: "updated description",
    });

    expect(updated.name).toBe("Tools updated");
    expect(updated.description).toBe("updated description");
  });

  it("should delete a category", async () => {
    const category = await categoryServerService.create({
      name: "Primary",
    });
    const result = await categoryServerService.delete(category.id);

    expect(result.success).toBe(true);
    const fetched = await categoryServerService.get(category.id);
    expect(fetched).toBeNull();
  });

  it("should enforce unique name constraint", async () => {
    try {
      await categoryServerService.create({
        ...categories[1],
        name: categories[0].name,
      });
      throw new Error(
        "Expected SequelizeUniqueConstraintError but no error was thrown"
      );
    } catch (err: any) {
      expect(err.name).toBe("SequelizeUniqueConstraintError");
      expect(getConstraintFields(err)).toContain("name");
    }
  });

  it("should update a category's sort order", async () => {
    const initialCategories = await categoryServerService.getAll();

    expect(initialCategories.length).toBe(2);
    expect(initialCategories[0].name).toBe("Tools");
    expect(initialCategories[1].name).toBe("Electronics");
    await categoryServerService.updateSort([
      initialCategories[1].id,
      initialCategories[0].id,
    ]);

    const updatedCategories = await categoryServerService.getAll();
    expect(updatedCategories.length).toBe(2);
    expect(updatedCategories[0].name).toBe("Electronics");
    expect(updatedCategories[1].name).toBe("Tools");
  });

  it("should enforce unique name constraint on update", async () => {
    try {
      await categoryServerService.update(1, { name: categories[1].name });
      throw new Error(
        "Expected SequelizeUniqueConstraintError but no error was thrown"
      );
    } catch (err: any) {
      expect(err.name).toBe("SequelizeUniqueConstraintError");
      expect(getConstraintFields(err)).toContain("name");
    }
  });

  it("should create and fetch a category with parent", async () => {
    const created = await categoryServerService.create({
      name: "Primary",
    });
    await categoryServerService.create({
      name: "Sub",
      description: "Sub",
      parentId: created.id,
    });
    const category: any = await categoryServerService.get(created.id);

    expect(category).not.toBeNull();
    expect(category.name).toBe("Primary");
    expect(category.description).toBeNull();
    expect(category.order).toBeNull();
    expect(category.subCategories.length).toBe(1);
    expect(category.subCategories[0].name).toBe("Sub");
  });
});
