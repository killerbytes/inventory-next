"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { triggerBackupAction } from "@/server/actions/backup.actions";
import { CheckCircle2, Database, Download, Loader2, Store } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("System settings updated successfully!");
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await triggerBackupAction();
      setLastBackup(res.timestamp);
      toast.success(res.message || "Database backup completed successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to trigger database backup");
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure business details, tax rates, inventory defaults, and
          maintenance procedures.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Organization Profile
            </CardTitle>
            <CardDescription>
              Header information printed on invoices and sales receipts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Business Name</label>
              <Input
                defaultValue="MY HARDWARE & CONSTRUCTION SUPPLY"
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  Tax Identification Number (TIN)
                </label>
                <Input
                  defaultValue="009-123-456-000"
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Default VAT Rate (%)
                </label>
                <Input defaultValue="12" className="mt-1.5 font-mono" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="px-8">
            Save Settings
          </Button>
        </div>
      </form>

      {/* Database Backup & Disaster Recovery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Database Backup & Maintenance
            </CardTitle>
            {lastBackup && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> Backup Ready
              </Badge>
            )}
          </div>
          <CardDescription>
            Generate an administrative snapshot archive of the PostgreSQL
            database schema and records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/40 border">
            <div>
              <div className="font-semibold text-sm">
                Full PostgreSQL Snapshot
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {lastBackup
                  ? `Last backup generated at: ${new Date(lastBackup).toLocaleString()}`
                  : "No backup generated during this session"}
              </div>
            </div>
            <Button
              type="button"
              onClick={handleBackup}
              disabled={isBackingUp}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {isBackingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isBackingUp ? "Backing up..." : "Backup Database"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
