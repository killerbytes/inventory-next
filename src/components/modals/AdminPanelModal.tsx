"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database, FileSpreadsheet } from "lucide-react";

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminPanelModal({ isOpen, onClose }: AdminPanelModalProps) {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSyncingGSheet, setIsSyncingGSheet] = useState(false);

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Admin Utilities Panel</DialogTitle>
          <DialogDescription>
            Execute administrative routines, database backups, and spreadsheet syncs.
          </DialogDescription>
        </DialogHeader>
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
            <span>{isSyncingGSheet ? "Syncing GSheet..." : "Sync Google Sheet"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
