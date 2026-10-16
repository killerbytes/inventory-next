"use client";

import { Button } from "@/components/ui/button";
import { triggerBackupAction } from "@/server/actions/backup.actions";
import { useUIStore } from "@/stores/uiStore";
import { Database, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Modal from "../common/Modal";

function AdminPanelModalContent() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSyncingGSheet, setIsSyncingGSheet] = useState(false);
  const { isAdminPanelModalOpen, setAdminPanelModalOpen } = useUIStore();

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await triggerBackupAction();
      toast.success(
        res.message || "Database backup workflow triggered successfully!"
      );
    } catch (err: any) {
      toast.error(err?.message || "Database backup routine failed.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSyncGSheet = async () => {
    setIsSyncingGSheet(true);
    try {
      toast.info("Google Sheets synchronization is currently not configured.");
    } finally {
      setIsSyncingGSheet(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 py-4">
        <Button
          variant="outline"
          onClick={handleBackup}
          disabled={isBackingUp}
          className="justify-start gap-2 h-11"
        >
          <Database className="h-4 w-4 text-purple-600" />
          <span>{isBackingUp ? "Backing up..." : "Backup Database"}</span>
        </Button>

        <Button
          variant="outline"
          onClick={handleSyncGSheet}
          disabled={isSyncingGSheet}
          className="justify-start gap-2 h-11"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span>
            {isSyncingGSheet ? "Syncing GSheet..." : "Sync Google Sheet"}
          </span>
        </Button>
      </div>
    </>
  );
}

export default function AdminPanelModal() {
  const { isAdminPanelModalOpen, setAdminPanelModalOpen } = useUIStore();

  if (!isAdminPanelModalOpen) return null;

  return (
    <Modal
      title="Admin Panel"
      description="Admin Panel Utilities."
      isOpen={isAdminPanelModalOpen}
      onClose={() => setAdminPanelModalOpen(false)}
    >
      <AdminPanelModalContent />
    </Modal>
  );
}
