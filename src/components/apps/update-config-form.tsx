"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { saveUpdateConfigAction } from "@/app/(app)/apps/actions";
import { useWriteGuard } from "./write-guard";
import type { Environment } from "@/lib/apps/env-config";
import type { UpdateConfigDTO } from "@/lib/apps/types";

const fieldLabelCls = "mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

const formSchema = z.object({
  isShow: z.boolean(),
  minVersion: z.string(),
  androidUrl: z.string(),
  iosUrl: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function UpdateConfigForm({
  environment,
  initialConfig,
}: {
  environment: Environment;
  initialConfig: UpdateConfigDTO | null;
}) {
  const router = useRouter();
  const { writesAllowed } = useWriteGuard();
  const [wasShowOn, setWasShowOn] = React.useState(initialConfig?.isShow ?? false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<FormValues | null>(null);
  const [saving, setSaving] = React.useState(false);

  const { register, handleSubmit, control } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isShow: initialConfig?.isShow ?? false,
      minVersion: initialConfig?.minVersion ?? "0.0.0",
      androidUrl: initialConfig?.androidUrl ?? "",
      iosUrl: initialConfig?.iosUrl ?? "",
    },
  });

  async function persist(values: FormValues) {
    setSaving(true);
    const res = await saveUpdateConfigAction(environment, values);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not save update config");
      return;
    }
    setWasShowOn(values.isShow);
    setConfirmOpen(false);
    toast.success("Update config saved");
    router.refresh();
  }

  function onSubmit(values: FormValues) {
    if (values.isShow && !wasShowOn) {
      setPendingValues(values);
      setConfirmOpen(true);
      return;
    }
    persist(values);
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {initialConfig === null && (
          <p className="text-xs text-muted-foreground">Document doesn&apos;t exist yet — Save to create it.</p>
        )}
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur">
          <span className="text-sm font-medium">Show Update Prompt</span>
          <Controller
            control={control}
            name="isShow"
            render={({ field }) => <Switch checked={field.value} disabled={!writesAllowed} onCheckedChange={field.onChange} />}
          />
        </div>
        <div className="rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur">
          <label className={fieldLabelCls}>Min Version</label>
          <Input placeholder="0.0.0" disabled={!writesAllowed} {...register("minVersion")} />
        </div>
        <div className="rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur">
          <label className={fieldLabelCls}>Android URL</label>
          <Input placeholder="https://play.google.com/…" disabled={!writesAllowed} {...register("androidUrl")} />
        </div>
        <div className="rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur">
          <label className={fieldLabelCls}>iOS URL</label>
          <Input placeholder="https://apps.apple.com/…" disabled={!writesAllowed} {...register("iosUrl")} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!writesAllowed} loading={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={(next) => { if (!saving) setConfirmOpen(next); }}>
        <DialogContent className="flex max-w-sm flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Enable Update Prompt</DialogTitle>
          </DialogHeader>
          <div className="px-5 py-5 text-sm text-muted-foreground">
            With Show Update Prompt on, every user in <span className="text-foreground">{environment}</span> below version{" "}
            <span className="text-foreground">{pendingValues?.minVersion}</span> will see an update modal that{" "}
            <span className="text-foreground">cannot be dismissed</span>. Continue?
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" disabled={saving} onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button size="sm" loading={saving} onClick={() => pendingValues && persist(pendingValues)}>{saving ? "Saving…" : "Confirm"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
