"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bumpVersionAction } from "@/app/(app)/apps/actions";
import type { Environment } from "@/lib/apps/env-config";

export function BumpVersionButton({ environment, disabled }: { environment: Environment; disabled?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [bumping, setBumping] = React.useState(false);

  async function confirmBump() {
    setBumping(true);
    const res = await bumpVersionAction(environment);
    setBumping(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not bump version");
      return;
    }
    setOpen(false);
    toast.success(`Version bumped to v${res.version}`);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        Bump Version
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!bumping) setOpen(next); }}>
        <DialogContent className="flex max-w-sm flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Bump Version</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-5 text-sm text-muted-foreground">
            Bump the version for <span className="text-foreground">{environment}</span> so mobile clients refetch secrets?
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" disabled={bumping} onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" loading={bumping} onClick={confirmBump}>{bumping ? "Bumping…" : "Confirm"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
