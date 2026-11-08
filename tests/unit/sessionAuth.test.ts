import { describe, expect, it } from "vitest";
import {
  resolveSessionUser,
  sealSession,
  SESSION_MAX_AGE_SECONDS,
  SessionUser,
  unsealSession,
} from "@/server/auth/session";

const sampleUser: SessionUser = {
  id: 42,
  name: "Jane Doe",
  username: "janedoe",
  role: "ADMIN",
};
const passwordHash = "$2b$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ01234";

const nowSeconds = () => Math.floor(Date.now() / 1000);

function forgeSigned(token: string, mutate: (claims: any) => void): string {
  // Re-sign is impossible without the secret; we only mutate to prove tampering is caught.
  const [payloadB64, signature] = token.split(".");
  const claims = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
  mutate(claims);
  return `${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${signature}`;
}

describe("Session token sealing", () => {
  it("round-trips a session and stamps iat/exp for the cookie lifetime", () => {
    const before = nowSeconds();
    const claims = unsealSession(sealSession(sampleUser, passwordHash));

    expect(claims).not.toBeNull();
    expect(claims?.id).toBe(sampleUser.id);
    expect(claims?.role).toBe(sampleUser.role);
    expect(claims!.iat).toBeGreaterThanOrEqual(before);
    expect(claims!.exp - claims!.iat).toBe(SESSION_MAX_AGE_SECONDS);
  });

  it("rejects a token whose signed expiry has passed, even if the browser still sends it", () => {
    const issuedLongAgo = Date.now() - (SESSION_MAX_AGE_SECONDS + 60) * 1000;
    const token = sealSession(sampleUser, passwordHash, issuedLongAgo);

    expect(unsealSession(token)).toBeNull();
  });

  it("rejects tokens tampered to escalate role", () => {
    const tampered = forgeSigned(sealSession(sampleUser, passwordHash), (c) => {
      c.role = "SUPER_ADMIN";
    });
    expect(unsealSession(tampered)).toBeNull();
  });

  it("rejects tokens tampered to extend expiry", () => {
    const tampered = forgeSigned(sealSession(sampleUser, passwordHash), (c) => {
      c.exp = c.exp + 365 * 24 * 3600;
    });
    expect(unsealSession(tampered)).toBeNull();
  });

  it("rejects tokens with invalid signatures", () => {
    const [payloadB64] = sealSession(sampleUser, passwordHash).split(".");
    expect(unsealSession(`${payloadB64}.${"0".repeat(64)}`)).toBeNull();
  });

  it("rejects legacy unsigned plaintext JSON", () => {
    expect(unsealSession(JSON.stringify(sampleUser))).toBeNull();
  });
});

describe("resolveSessionUser (server-side revocation)", () => {
  const activeRow = {
    id: 42,
    name: "Jane Doe",
    username: "janedoe",
    role: "ADMIN",
    password: passwordHash,
    isActive: true,
    deletedAt: null,
  };
  const claims = () => unsealSession(sealSession(sampleUser, passwordHash))!;

  it("accepts an active user whose password is unchanged", () => {
    expect(resolveSessionUser(claims(), activeRow)).toEqual(sampleUser);
  });

  it("uses the current DB role so demotions take effect immediately", () => {
    const resolved = resolveSessionUser(claims(), { ...activeRow, role: "CASHIER" });
    expect(resolved?.role).toBe("CASHIER");
  });

  it.each([
    ["the user no longer exists", null],
    ["the user is soft-deleted", { ...activeRow, deletedAt: new Date() }],
    ["the user is deactivated", { ...activeRow, isActive: false }],
    ["the password was changed after the session was issued", { ...activeRow, password: "$2b$10$different-hash" }],
  ])("rejects the session when %s", (_label, row) => {
    expect(resolveSessionUser(claims(), row as any)).toBeNull();
  });
});
