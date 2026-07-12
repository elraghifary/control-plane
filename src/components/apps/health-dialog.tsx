"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getHealthAction } from "@/app/(app)/apps/actions";
import type { EnvHealth } from "@/lib/apps/types";

export function HealthDialog() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<EnvHealth[]>([]);

  async function load() {
    setLoading(true);
    const res = await getHealthAction();
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not check health");
      return;
    }
    setResults(res.results);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
  }

  return (
    <>
      <Button size="sm" onClick={() => handleOpenChange(true)}>Health</Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-[min(90vh,860px)] max-w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1200px)]">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Environment Health</DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">Checks Firestore connectivity for each environment.</p>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Checking…</p>
            ) : (
              results.map((r) => (
                <div
                  key={r.env}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur"
                >
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    {r.error && <p className="mt-1 max-w-md truncate font-mono text-xs text-status-error">{r.error}</p>}
                  </div>
                  <Badge variant={!r.configured ? "secondary" : r.ok ? "healthy" : "error"} size="sm">
                    {!r.configured ? "Not configured" : r.ok ? "Connected" : "Failed"}
                  </Badge>
                </div>
              ))
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" disabled={loading} onClick={load}>{loading ? "Checking…" : "Recheck"}</Button>
            <Button size="sm" onClick={() => handleOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
