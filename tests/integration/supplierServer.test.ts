import { supplierServerService } from "@/server/services/supplierServer.service";
import { resetDatabase, setupDatabase } from "../setup";
import { createSupplier, getConstraintFields, suppliers } from "../utils/fixtures";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  await createSupplier(0);
  await createSupplier(1);
});

describe("Supplier Service (Integration)", () => {
  it("should create and fetch a supplier", async () => {
    const created = await supplierServerService.create({
      name: "Test Supplier",
      email: "email@test.com",
      phone: "1234567890",
      address: "123 Main St",
    });
    const supplier = await supplierServerService.get(created.id);

    expect(supplier).not.toBeNull();
    expect(supplier?.name).toBe("Test Supplier");
    expect(supplier?.email).toBe("email@test.com");
    expect(supplier?.phone).toBe("1234567890");
    expect(supplier?.address).toBe("123 Main St");
  });

  it("should create a supplier with only name and allow multiple suppliers without email", async () => {
    const supp1 = await supplierServerService.create({
      name: "Only Name Supplier 1",
    });
    const supp2 = await supplierServerService.create({
      name: "Only Name Supplier 2",
      email: "",
      phone: "",
      address: "",
    });

    const fetched1 = await supplierServerService.get(supp1.id);
    const fetched2 = await supplierServerService.get(supp2.id);

    expect(fetched1?.name).toBe("Only Name Supplier 1");
    expect(fetched1?.email).toBeNull();
    expect(fetched1?.phone).toBeNull();
    expect(fetched1?.address).toBeNull();

    expect(fetched2?.name).toBe("Only Name Supplier 2");
    expect(fetched2?.email).toBeNull();
    expect(fetched2?.phone).toBeNull();
    expect(fetched2?.address).toBeNull();
  });

  it("should list all suppliers", async () => {
    const allSuppliers = await supplierServerService.getAll();
    expect(allSuppliers.data.length).toBe(2);
  });

  it("should update a supplier email", async () => {
    const supplier = await supplierServerService.create({
      name: "Test Supplier",
      email: "email@test.com",
      phone: "1234567890",
      address: "123 Main St",
    });
    const updated = await supplierServerService.update(supplier.id, {
      email: "newalice@test.com",
      name: "Alice Updated",
      address: "123 Main St updated",
      phone: "34343",
    });

    expect(updated.name).toBe("Alice Updated");
    expect(updated.email).toBe("newalice@test.com");
    expect(updated.address).toBe("123 Main St updated");
    expect(updated.phone).toBe("34343");
  });

  it("should delete a supplier", async () => {
    const supplier = await supplierServerService.create({
      name: "Test Supplier",
      email: "email@test.com",
      phone: "1234567890",
      address: "123 Main St",
    });
    const result = await supplierServerService.delete(supplier.id);

    expect(result.success).toBe(true);
    const fetched = await supplierServerService.get(supplier.id);
    expect(fetched).toBeNull();
  });

  it("should enforce unique email constraint", async () => {
    try {
      await supplierServerService.create({
        ...suppliers[1],
        email: suppliers[0].email,
      });
      throw new Error(
        "Expected SequelizeUniqueConstraintError but no error was thrown"
      );
    } catch (err: any) {
      expect(err.name).toBe("SequelizeUniqueConstraintError");
      expect(getConstraintFields(err)).toContain("email");
    }
  });

  it("should return empty array for non-existent product in getByProductId", async () => {
    const history = await supplierServerService.getByProductId(999999);
    expect(history).toEqual([]);
  });
});
