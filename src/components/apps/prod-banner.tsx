"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWriteGuard } from "./write-guard";

export function ProdBanner() {
  const { environment, armed, arm, disarm } = useWriteGuard();
  if (environment !== "production") return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-status-error/30 bg-status-error/10 px-3 py-2 text-xs text-status-error">
      <span className="flex items-center gap-2">
        {armed ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        {armed
          ? "Production writes are armed for this tab — add/edit/delete/bump are enabled."
          : "Production writes are locked. Arm this tab to add, edit, delete, or bump version."}
      </span>
      <Button size="sm" variant="outline" className="shrink-0" onClick={armed ? disarm : arm}>
        {armed ? "Lock Writes" : "Arm Writes"}
      </Button>
    </div>
  );
}
