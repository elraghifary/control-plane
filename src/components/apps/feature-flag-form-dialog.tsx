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
import { createFeatureFlagAction } from "@/app/(app)/apps/actions";
import type { Environment } from "@/lib/apps/env-config";

const fieldLabelCls = "mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

const formSchema = z.object({
  id: z.string().min(1, "Flag key is required"),
  isShowAndroid: z.boolean(),
  isShowIos: z.boolean(),
  minVersion: z.string().min(1, "Min version is required"),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormValues = { id: "", isShowAndroid: false, isShowIos: false, minVersion: "0.0.0" };

export function FeatureFlagFormDialog({
  environment,
  open,
  onOpenChange,
}: {
  environment: Environment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: DEFAULT_VALUES });

  React.useEffect(() => {
    if (open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  async function submit(values: FormValues) {
    const res = await createFeatureFlagAction(environment, values.id, {
      isShowAndroid: values.isShowAndroid,
      isShowIos: values.isShowIos,
      minVersion: values.minVersion,
    });
    if (!res.ok) {
      toast.error(res.error ?? "Could not create flag");
      return;
    }
    toast.success("Flag created");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-sm flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="text-base">Add Feature Flag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)}>
          <div className="space-y-4 px-5 py-5">
            <div>
              <label className={fieldLabelCls}>Flag Key</label>
              <Input placeholder="Flag Key" {...register("id")} />
              {errors.id && <p className="mt-1.5 text-xs text-status-error">{errors.id.message}</p>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Android</span>
              <Controller control={control} name="isShowAndroid" render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">iOS</span>
              <Controller control={control} name="isShowIos" render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>
            <div>
              <label className={fieldLabelCls}>Min Version</label>
              <Input placeholder="0.0.0" {...register("minVersion")} />
              {errors.minVersion && <p className="mt-1.5 text-xs text-status-error">{errors.minVersion.message}</p>}
            </div>
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" loading={isSubmitting}>{isSubmitting ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
