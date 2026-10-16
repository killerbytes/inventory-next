import "server-only";

export interface BackupTriggerResult {
  success: boolean;
  message: string;
  timestamp: string;
  dispatchedTo: "github-actions" | "local";
  filename?: string;
}

export const backupServerService = {
  /**
   * Dispatches the database backup workflow to GitHub Actions via REST API.
   */
  triggerBackup: async (): Promise<BackupTriggerResult> => {
    const timestamp = new Date().toISOString();
    const token = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER || "killerbytes";
    const repo = process.env.GITHUB_REPO || "inventory-next";
    const workflowId = process.env.GITHUB_WORKFLOW_ID || "db-backup.yml";
    const ref = process.env.GITHUB_BRANCH || "main";

    if (!token) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "GitHub Personal Access Token (GITHUB_PAT) is not configured in production environment."
        );
      }
      throw new Error(
        "GITHUB_PAT is not configured. Please set GITHUB_PAT or GITHUB_TOKEN to trigger GitHub Actions backup."
      );
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "inventory-next-app",
      },
      body: JSON.stringify({ ref }),
    });

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const rawText = await response.text();
        try {
          const errJson = JSON.parse(rawText);
          if (errJson?.message) {
            errorMessage = errJson.message;
          } else if (rawText) {
            errorMessage = rawText;
          }
        } catch {
          if (rawText) errorMessage = rawText;
        }
      } catch {
        // Fallback to response.statusText
      }

      throw new Error(
        `GitHub Actions workflow dispatch failed (${response.status}): ${errorMessage}`
      );
    }

    return {
      success: true,
      message: "Database backup workflow triggered on GitHub Actions.",
      timestamp,
      dispatchedTo: "github-actions",
    };
  },
};

export default backupServerService;
