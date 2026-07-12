"use client";

import * as React from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Copy as CopyIcon, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/utils";
import { revealSecretAction } from "@/app/(app)/apps/actions";
import { useWriteGuard } from "./write-guard";
import type { Environment } from "@/lib/apps/env-config";
import type { SecretDTO } from "@/lib/apps/types";

export function SecretRow({
  environment,
  secret,
  onEdit,
  onDelete,
}: {
  environment: Environment;
  secret: SecretDTO;
  onEdit: (secret: SecretDTO) => void;
  onDelete: (secret: SecretDTO) => void;
}) {
  const { writesAllowed } = useWriteGuard();
  const [revealed, setRevealed] = React.useState(false);
  const [plaintext, setPlaintext] = React.useState<string | null>(null);
  const [revealing, setRevealing] = React.useState(false);

  async function toggleReveal() {
    if (revealed) {
      setRevealed(false);
      return;
    }
    if (plaintext !== null) {
      setRevealed(true);
      return;
    }
    setRevealing(true);
    const res = await revealSecretAction(environment, secret.id);
    setRevealing(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not reveal secret");
      return;
    }
    setPlaintext(res.value ?? "");
    setRevealed(true);
  }

  async function copyShown() {
    const shown = revealed ? (plaintext ?? "") : secret.value;
    const ok = await copyToClipboard(shown);
    if (ok) toast.success("Copied");
    else toast.error("Could not copy");
  }

  const shownValue = revealed ? (plaintext ?? "") : secret.value;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur transition-colors hover:border-instrument/30">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{secret.key}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {shownValue || "(empty)"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="icon-sm" variant="outline" disabled={revealing} onClick={toggleReveal} title={revealed ? "Hide" : "Reveal"}>
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon-sm" variant="outline" onClick={copyShown} title="Copy">
          <CopyIcon className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="outline" disabled={!writesAllowed} onClick={() => onEdit(secret)} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="outline" disabled={!writesAllowed} onClick={() => onDelete(secret)} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
