import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backupServerService } from "@/server/services/backupServer.service";

describe("BackupServerService (Unit)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("should successfully dispatch workflow to GitHub Actions when GITHUB_PAT is set", async () => {
    // Arrange
    process.env.GITHUB_PAT = "ghp_mock_token_123";
    process.env.GITHUB_OWNER = "killerbytes";
    process.env.GITHUB_REPO = "inventory-next";
    process.env.GITHUB_WORKFLOW_ID = "db-backup.yml";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    // Act
    const result = await backupServerService.triggerBackup();

    // Assert
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/killerbytes/inventory-next/actions/workflows/db-backup.yml/dispatches",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer ghp_mock_token_123",
          Accept: "application/vnd.github.v3+json",
        }),
        body: JSON.stringify({ ref: "main" }),
      })
    );
    expect(result.success).toBe(true);
    expect(result.dispatchedTo).toBe("github-actions");
    expect(result.message).toContain("GitHub Actions");
    expect(result.timestamp).toBeDefined();
  });

  it("should throw a descriptive error when GitHub Actions API returns an error", async () => {
    // Arrange
    process.env.GITHUB_PAT = "ghp_invalid_token";
    process.env.GITHUB_OWNER = "killerbytes";
    process.env.GITHUB_REPO = "inventory-next";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: "Bad credentials" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Act & Assert
    await expect(backupServerService.triggerBackup()).rejects.toThrow(
      /GitHub Actions workflow dispatch failed \(401\): Bad credentials/i
    );
  });

  it("should throw an error when GITHUB_PAT is not configured in production", async () => {
    // Arrange
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.GITHUB_PAT;
    delete process.env.GITHUB_TOKEN;

    // Act & Assert
    await expect(backupServerService.triggerBackup()).rejects.toThrow(
      /GITHUB_PAT/i
    );
  });
});
