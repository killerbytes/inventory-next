import { describe, expect, it } from "vitest";
import { sealSession, unsealSession, SessionUser } from "@/server/auth/session";

describe("Session Auth (Unit)", () => {
  const sampleUser: SessionUser = {
    id: 42,
    name: "Jane Doe",
    username: "janedoe",
    role: "ADMIN",
  };

  it("should securely seal and unseal a valid session user", () => {
    // Arrange
    const user = { ...sampleUser };

    // Act
    const token = sealSession(user);
    const unsealed = unsealSession(token);

    // Assert
    expect(token).toBeDefined();
    expect(token).toContain(".");
    expect(unsealed).not.toBeNull();
    expect(unsealed?.id).toBe(user.id);
    expect(unsealed?.username).toBe(user.username);
    expect(unsealed?.role).toBe(user.role);
  });

  it("should reject tampered session tokens with modified payload", () => {
    // Arrange
    const token = sealSession(sampleUser);
    const [payloadB64, signature] = token.split(".");

    // Tamper with payload to escalate role to SUPER_ADMIN
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    decoded.role = "SUPER_ADMIN";
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(decoded)).toString("base64url");
    const tamperedToken = `${tamperedPayloadB64}.${signature}`;

    // Act
    const result = unsealSession(tamperedToken);

    // Assert
    expect(result).toBeNull();
  });

  it("should reject tokens with invalid signatures", () => {
    // Arrange
    const token = sealSession(sampleUser);
    const [payloadB64] = token.split(".");
    const invalidToken = `${payloadB64}.0000000000000000000000000000000000000000000000000000000000000000`;

    // Act
    const result = unsealSession(invalidToken);

    // Assert
    expect(result).toBeNull();
  });

  it("should reject legacy unsigned plaintext JSON", () => {
    // Arrange
    const rawJson = JSON.stringify(sampleUser);

    // Act
    const result = unsealSession(rawJson);

    // Assert
    expect(result).toBeNull();
  });
});
