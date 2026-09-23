import { userServerService } from "@/server/services/userServer.service";
import { resetDatabase, setupDatabase } from "../setup";
import { createUser, getConstraintFields, users } from "../utils/fixtures";

beforeAll(async () => {
  await setupDatabase();
});

beforeEach(async () => {
  await resetDatabase();
  await createUser(0);
  await createUser(1);
});

describe("User Service (Integration)", () => {
  it("should create and fetch a user", async () => {
    const user = await userServerService.get(1);
    expect(user).not.toBeNull();
    expect(user?.name).toBe(users[0].name);
    expect(user?.email).toBe(users[0].email);
    expect(user?.username).toBe(users[0].username);
  });

  it("should list all users", async () => {
    const allUsers = await userServerService.getAll();
    expect(allUsers.length).toBe(2);
  });

  it("should update a user email", async () => {
    const updated = await userServerService.update(1, {
      email: "newalice@test.com",
      name: "Alice Updated",
      username: "alice_updated",
    });

    expect(updated?.name).toBe("Alice Updated");
    expect(updated?.email).toBe("newalice@test.com");
    expect(updated?.username).toBe("alice_updated");
  });

  it("should delete a user", async () => {
    const user = await userServerService.get(1);
    expect(user).not.toBeNull();
    const result = await userServerService.delete(user!.id);

    expect(result?.success).toBe(true);

    const fetched = await userServerService.get(user!.id);
    expect(fetched).toBeNull();
  });

  it("should enforce unique username constraint", async () => {
    try {
      await userServerService.create({
        ...users[0],
        email: "test@email.com",
        confirmPassword: users[0].password,
      } as any);
      throw new Error(
        "Expected SequelizeUniqueConstraintError but no error was thrown"
      );
    } catch (err: any) {
      expect(err.name).toBe("SequelizeUniqueConstraintError");
      expect(getConstraintFields(err)).toContain("username");
    }
  });

  it("should enforce unique email constraint", async () => {
    try {
      await userServerService.create({
        ...users[1],
        username: "unique_charlie",
        email: users[0].email,
        confirmPassword: users[1].password,
      } as any);
      throw new Error(
        "Expected SequelizeUniqueConstraintError but no error was thrown"
      );
    } catch (err: any) {
      expect(err.name).toBe("SequelizeUniqueConstraintError");
      expect(getConstraintFields(err)).toContain("email");
    }
  });

  it("should get a paginated list of users", async () => {
    const result = await userServerService.getPaginated({
      page: 1,
      limit: 1,
    });
    expect(result.data.length).toBe(1);
    expect(result.meta.total).toBe(2);
    expect(result.meta.totalPages).toBe(2);
    expect(result.meta.currentPage).toBe(1);
  });

  it("should update a user's sort order", async () => {
    const result = await userServerService.getPaginated({
      page: 1,
      limit: 1,
      sort: "username",
      order: "DESC",
    });
    expect(result.data.length).toBe(1);
    expect(result.data[0].username).toBe("charlie");
  });

  it("should query users by name", async () => {
    const result = await userServerService.getPaginated({
      q: "cha",
      page: 1,
      limit: 1,
    });
    expect(result.data.length).toBe(1);
    expect(result.data[0].username).toBe("charlie");
  });
});
