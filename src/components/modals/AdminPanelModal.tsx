"use client";

import { Button } from "@/components/ui/button";
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
      const res = await fetch("/api/admin/backup", { method: "POST" });
      if (!res.ok) throw new Error("Backup failed");
      toast.success("Database backup generated successfully!");
    } catch {
      toast.error("Database backup routine failed.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSyncGSheet = async () => {
    setIsSyncingGSheet(true);
    try {
      const res = await fetch("/api/admin/gsheet-sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      toast.success("Google Sheets synchronized successfully!");
    } catch {
      toast.error("Google Sheets sync failed.");
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
