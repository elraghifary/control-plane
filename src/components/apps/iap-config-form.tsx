"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { saveIapConfigAction } from "@/app/(app)/apps/actions";
import { useWriteGuard } from "./write-guard";
import type { Environment } from "@/lib/apps/env-config";
import type { IapConfigDTO } from "@/lib/apps/types";

const fieldLabelCls = "mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

const formSchema = z.object({
  showAndroid: z.boolean(),
  showIos: z.boolean(),
  showInternalTesting: z.boolean(),
  androidProductIds: z.string(),
  iosProductIds: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

function parseIds(text: string): string[] {
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

export function IapConfigForm({
  environment,
  initialConfig,
}: {
  environment: Environment;
  initialConfig: IapConfigDTO | null;
}) {
  const router = useRouter();
  const { writesAllowed } = useWriteGuard();
  const [saving, setSaving] = React.useState(false);

  const { register, handleSubmit, control } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      showAndroid: initialConfig?.showAndroid ?? false,
      showIos: initialConfig?.showIos ?? false,
      showInternalTesting: initialConfig?.showInternalTesting ?? false,
      androidProductIds: (initialConfig?.androidProductIds ?? []).join("\n"),
      iosProductIds: (initialConfig?.iosProductIds ?? []).join("\n"),
    },
  });

  async function submit(values: FormValues) {
    setSaving(true);
    const res = await saveIapConfigAction(environment, {
      showAndroid: values.showAndroid,
      showIos: values.showIos,
      showInternalTesting: values.showInternalTesting,
      androidProductIds: parseIds(values.androidProductIds),
      iosProductIds: parseIds(values.iosProductIds),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not save in-app purchases config");
      return;
    }
    toast.success("In-App Purchases config saved");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {initialConfig === null && (
        <p className="text-xs text-muted-foreground">Document doesn&apos;t exist yet — Save to create it.</p>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur">
          <span className="text-sm font-medium">Show on Android</span>
          <Controller
            control={control}
            name="showAndroid"
            render={({ field }) => <Switch checked={field.value} disabled={!writesAllowed} onCheckedChange={field.onChange} />}
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur">
          <span className="text-sm font-medium">Show on iOS</span>
          <Controller
            control={control}
            name="showIos"
            render={({ field }) => <Switch checked={field.value} disabled={!writesAllowed} onCheckedChange={field.onChange} />}
          />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur">
          <span className="text-sm font-medium">Force Show for Internal Testing</span>
          <Controller
            control={control}
            name="showInternalTesting"
            render={({ field }) => <Switch checked={field.value} disabled={!writesAllowed} onCheckedChange={field.onChange} />}
          />
        </div>
      </div>
      <div className="rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur">
        <label className={fieldLabelCls}>Android Product IDs</label>
        <Textarea
          rows={4}
          placeholder={"id.happykids.membership\nid.happykids.bundle"}
          disabled={!writesAllowed}
          className="font-mono text-xs"
          {...register("androidProductIds")}
        />
      </div>
      <div className="rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur">
        <label className={fieldLabelCls}>iOS Product IDs</label>
        <Textarea
          rows={4}
          placeholder={"id.happykids.membership\nid.happykids.bundle"}
          disabled={!writesAllowed}
          className="font-mono text-xs"
          {...register("iosProductIds")}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!writesAllowed} loading={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </form>
  );
}
