import { customerServerService } from "@/server/services/customerServer.service";
import { resetDatabase, setupDatabase } from "../setup";
import { createCustomer, customers, getConstraintFields } from "../utils/fixtures";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  await createCustomer(0);
  await createCustomer(1);
});

describe("Customer Service (Integration)", () => {
  it("should create and fetch a customer", async () => {
    const created = await customerServerService.create({
      name: "Test Customer",
      address: "123 Main St",
      phone: "1234567890",
      email: "email@test.com",
    });
    const customer = await customerServerService.get(created.id);

    expect(customer).not.toBeNull();
    expect(customer?.name).toBe("Test Customer");
    expect(customer?.email).toBe("email@test.com");
    expect(customer?.phone).toBe("1234567890");
  });

  it("should list all customers", async () => {
    const allCustomers = await customerServerService.getAll();
    expect(allCustomers.length).toBe(2);
  });

  it("should update a customer email", async () => {
    const customer = await customerServerService.create({
      name: "Test Customer",
      address: "123 Main St",
      phone: "1234567890",
    });
    const updated = await customerServerService.update(customer.id, {
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

  it("should delete a customer", async () => {
    const customer = await customerServerService.create({
      name: "Test Customer",
      address: "123 Main St",
      phone: "1234567890",
    });
    const result = await customerServerService.delete(customer.id);

    expect(result.success).toBe(true);
    const fetched = await customerServerService.get(customer.id);
    expect(fetched).toBeNull();
  });

  it("should enforce unique email constraint", async () => {
    try {
      await customerServerService.create({
        ...customers[1],
        email: customers[0].email,
      });
      throw new Error(
        "Expected SequelizeUniqueConstraintError but no error was thrown"
      );
    } catch (err: any) {
      expect(err.name).toBe("SequelizeUniqueConstraintError");
      expect(getConstraintFields(err)).toContain("email");
    }
  });

  it("should get a paginated list of customers", async () => {
    const res = await customerServerService.getPaginated({
      page: 1,
      limit: 1,
    });
    expect(res.data.length).toBe(1);
    expect(res.meta.total).toBe(2);
    expect(res.meta.totalPages).toBe(2);
    expect(res.meta.currentPage).toBe(1);
  });

  it("should update a customer's sort order", async () => {
    const res = await customerServerService.getPaginated({
      page: 1,
      limit: 1,
      sort: "name",
      order: "DESC",
    });
    expect(res.data.length).toBe(1);
    expect(res.data[0].name).toBe("Charlie Customer");
  });

  it("should query customers by name", async () => {
    const res = await customerServerService.getPaginated({
      q: "cha",
      page: 1,
      limit: 1,
    });

    expect(res.data.length).toBe(1);
    expect(res.data[0].name).toBe("Charlie Customer");
  });
});
