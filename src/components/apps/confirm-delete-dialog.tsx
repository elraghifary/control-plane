"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteSecretAction } from "@/app/(app)/apps/actions";
import type { Environment } from "@/lib/apps/env-config";
import type { SecretDTO } from "@/lib/apps/types";

export function ConfirmDeleteDialog({
  environment,
  secret,
  open,
  onOpenChange,
}: {
  environment: Environment;
  secret: SecretDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = React.useState(false);

  async function confirmDelete() {
    if (!secret) return;
    setDeleting(true);
    const res = await deleteSecretAction(environment, secret.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not delete secret");
      return;
    }
    toast.success("Secret deleted");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!deleting) onOpenChange(next); }}>
      <DialogContent className="flex max-w-sm flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="text-base">Delete Secret</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-5 text-sm text-muted-foreground">
          Delete <span className="text-foreground">{secret?.key}</span>? This cannot be undone.
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" size="sm" disabled={deleting} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" variant="destructive" loading={deleting} onClick={confirmDelete}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
