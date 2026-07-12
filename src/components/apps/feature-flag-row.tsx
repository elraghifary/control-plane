"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateFeatureFlagAction } from "@/app/(app)/apps/actions";
import { useWriteGuard } from "./write-guard";
import type { Environment } from "@/lib/apps/env-config";
import type { FeatureFlagDTO } from "@/lib/apps/types";

type ToggleField = "isShowAndroid" | "isShowIos";

export function FeatureFlagRow({
  environment,
  flag,
  onDelete,
}: {
  environment: Environment;
  flag: FeatureFlagDTO;
  onDelete: (flag: FeatureFlagDTO) => void;
}) {
  const router = useRouter();
  const { writesAllowed } = useWriteGuard();
  const [pendingToggle, setPendingToggle] = React.useState<{ field: ToggleField; next: boolean } | null>(null);
  const [minVersion, setMinVersion] = React.useState(flag.minVersion);
  const [saving, setSaving] = React.useState(false);

  async function confirmToggle() {
    if (!pendingToggle) return;
    setSaving(true);
    const res = await updateFeatureFlagAction(environment, flag.id, { [pendingToggle.field]: pendingToggle.next });
    setSaving(false);
    setPendingToggle(null);
    if (!res.ok) {
      toast.error(res.error ?? "Could not update flag");
      return;
    }
    toast.success("Flag updated");
    router.refresh();
  }

  async function commitMinVersion() {
    const trimmed = minVersion.trim();
    if (trimmed === flag.minVersion) return;
    const res = await updateFeatureFlagAction(environment, flag.id, { minVersion: trimmed });
    if (!res.ok) {
      toast.error(res.error ?? "Could not update flag");
      setMinVersion(flag.minVersion);
      return;
    }
    toast.success("Flag updated");
    router.refresh();
  }

  const toggleLabel = pendingToggle?.field === "isShowAndroid" ? "Android" : "iOS";

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur transition-colors hover:border-instrument/30">
        <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium">{flag.id}</span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">Android</span>
          <Switch checked={flag.isShowAndroid} disabled={!writesAllowed} onCheckedChange={(next) => setPendingToggle({ field: "isShowAndroid", next })} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">iOS</span>
          <Switch checked={flag.isShowIos} disabled={!writesAllowed} onCheckedChange={(next) => setPendingToggle({ field: "isShowIos", next })} />
        </div>
        <Input
          value={minVersion}
          disabled={!writesAllowed}
          onChange={(e) => setMinVersion(e.target.value)}
          onBlur={commitMinVersion}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          className="w-24 shrink-0 text-xs"
        />
        <Button size="icon-sm" variant="outline" disabled={!writesAllowed} onClick={() => onDelete(flag)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Dialog open={!!pendingToggle} onOpenChange={(next) => { if (!saving && !next) setPendingToggle(null); }}>
        <DialogContent className="flex max-w-sm flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Change Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-5 text-sm text-muted-foreground">
            Turn <span className="text-foreground">{toggleLabel}</span> {pendingToggle?.next ? "on" : "off"} for flag{" "}
            <span className="font-mono text-foreground">{flag.id}</span>?
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" disabled={saving} onClick={() => setPendingToggle(null)}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={confirmToggle}>{saving ? "Saving…" : "Confirm"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
