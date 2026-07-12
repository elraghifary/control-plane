"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createSecretAction, updateSecretAction, revealSecretAction } from "@/app/(app)/apps/actions";
import type { Environment } from "@/lib/apps/env-config";
import type { SecretDTO } from "@/lib/apps/types";

const fieldLabelCls = "mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

const formSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

type FormValues = z.infer<typeof formSchema>;

type Step = "form" | "confirm";

export function SecretFormDialog({
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
  const isEdit = !!secret;
  const [step, setStep] = React.useState<Step>("form");
  const [loadingValue, setLoadingValue] = React.useState(false);
  const [originalValue, setOriginalValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { key: "", value: "" } });

  const value = watch("value");

  React.useEffect(() => {
    if (!open) return;
    setStep("form");
    setError(null);
    if (secret) {
      reset({ key: secret.key, value: "" });
      setLoadingValue(true);
      revealSecretAction(environment, secret.id).then((res) => {
        setLoadingValue(false);
        const plaintext = res.ok ? (res.value ?? "") : "";
        setOriginalValue(plaintext);
        reset({ key: secret.key, value: plaintext });
      });
    } else {
      setOriginalValue("");
      reset({ key: "", value: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, secret]);

  function goToConfirm(values: FormValues) {
    if (!isEdit) return submit(values);
    setStep("confirm");
  }

  async function submit(values: FormValues) {
    setError(null);
    const res = isEdit
      ? await updateSecretAction(environment, secret!.id, values.value)
      : await createSecretAction(environment, values.key, values.value);
    if (!res.ok) {
      toast.error(res.error ?? "Could not save secret");
      setError(res.error ?? "Could not save secret");
      setStep("form");
      return;
    }
    toast.success(isEdit ? "Secret updated" : "Secret created");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">
        {step === "form" && (
          <>
            <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
              <DialogTitle className="text-base">{isEdit ? "Edit Secret" : "Add Secret"}</DialogTitle>
              {error && <p className="mt-1 text-xs text-status-error">{error}</p>}
            </DialogHeader>

            <form onSubmit={handleSubmit(goToConfirm)} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-4">
                <div>
                  <label className={fieldLabelCls}>Key</label>
                  <Input placeholder="Key" disabled={isEdit} {...register("key")} />
                  {errors.key && <p className="mt-1.5 text-xs text-status-error">{errors.key.message}</p>}
                </div>
                <div>
                  <label className={fieldLabelCls}>Value</label>
                  <Textarea
                    rows={4}
                    placeholder={loadingValue ? "Loading…" : "Value"}
                    disabled={loadingValue}
                    className="text-xs placeholder:text-sm"
                    {...register("value")}
                  />
                  {errors.value && <p className="mt-1.5 text-xs text-status-error">{errors.value.message}</p>}
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={loadingValue} loading={!isEdit && isSubmitting}>
                  {isEdit ? "Review Changes" : isSubmitting ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
              <DialogTitle className="text-base">Confirm Update</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-4 text-sm">
              <p className="text-muted-foreground">
                Update <span className="text-foreground">{secret?.key}</span>?
              </p>
              <div>
                <label className={fieldLabelCls}>Before</label>
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-status-error/5 px-3 py-2 text-xs text-status-error">{originalValue || "(empty)"}</pre>
              </div>
              <div>
                <label className={fieldLabelCls}>After</label>
                <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-status-healthy/5 px-3 py-2 text-xs text-status-healthy">{value || "(empty)"}</pre>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
              <Button variant="outline" size="sm" disabled={isSubmitting} onClick={() => setStep("form")}>Back</Button>
              <Button size="sm" loading={isSubmitting} onClick={handleSubmit(submit)}>
                {isSubmitting ? "Saving…" : "Confirm Update"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
