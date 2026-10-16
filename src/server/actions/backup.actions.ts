"use server";

import { PERMISSIONS } from "@/lib/rbac";
import backupServerService from "@/server/services/backupServer.service";
import { createProtectedAction } from "./safeAction";

/**
 * Administrative server action to trigger full database backup.
 */
export const triggerBackupAction = createProtectedAction({
  permission: PERMISSIONS.MANAGE_SETTINGS,
  handler: async () => {
    return await backupServerService.triggerBackup();
  },
});
