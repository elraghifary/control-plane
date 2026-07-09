"use client";

import * as React from "react";
import { z } from "zod";
import { useForm, useFieldArray, Controller, type Control, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RepoCombobox, OptionCombobox } from "@/components/clickup/comboboxes";
import { fetchManifestPageContentAction, saveManifestPageContentAction } from "@/app/(app)/manifests/actions";
import { emptyManifestInput, type ManifestInput } from "@/lib/clickup/manifest-markdown";
import type { ClickUpManifestPage } from "@/lib/clickup/types";
import type { Repository } from "@/lib/data/types";

const fieldLabelCls = "mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

const TYPE_OPTIONS = ["ENV", "DDL", "DML", "Redis", "Other"].map((v) => ({ value: v, label: v }));
const EXECUTED_OPTIONS = [{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }];

const manifestEntrySchema = z.object({
  repository: z.string().min(1, "Repository is required").refine((v) => v !== "-", { message: "Repository is required" }),
  type: z.string().min(1, "Type is required"),
  value: z.string().min(1, "Value is required").refine((v) => v !== "-", { message: "Value is required" }),
  executed: z.enum(["Yes", "No"]),
});

const manifestFormSchema = z.object({
  development: z.array(manifestEntrySchema),
  staging: z.array(manifestEntrySchema),
  production: z.array(manifestEntrySchema),
});

type ManifestFormValues = z.infer<typeof manifestFormSchema>;

const ENV_SECTIONS: { key: keyof ManifestFormValues; label: string }[] = [
  { key: "development", label: "Development" },
  { key: "staging", label: "Staging" },
  { key: "production", label: "Production" },
];

function AutoGrowTextarea({
  value,
  onChange,
  onBlur,
  name,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  name: string;
  placeholder?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <Textarea
      ref={ref}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={4}
      className={cn("min-h-[96px] resize-none overflow-hidden", className)}
    />
  );
}

function EnvSection({
  envKey,
  label,
  control,
  watch,
  setValue,
  getValues,
  errors,
  repositories,
  expanded,
  onToggle,
  pullFromLabel,
  pullFromEntries,
}: {
  envKey: keyof ManifestFormValues;
  label: string;
  control: Control<ManifestFormValues>;
  watch: ReturnType<typeof useForm<ManifestFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<ManifestFormValues>>["setValue"];
  getValues: ReturnType<typeof useForm<ManifestFormValues>>["getValues"];
  errors: FieldErrors<ManifestFormValues>;
  repositories: Repository[];
  expanded: boolean;
  onToggle: () => void;
  pullFromLabel?: string;
  pullFromEntries?: ManifestFormValues[keyof ManifestFormValues];
}) {
  const { fields, prepend, remove, replace } = useFieldArray({ control, name: envKey });
  const entries = watch(envKey);
  const sectionErrors = errors[envKey];

  function updateEntry(index: number, patch: Partial<ManifestFormValues[typeof envKey][number]>) {
    const path = `${envKey}.${index}` as const;
    setValue(path, { ...getValues(path), ...patch }, { shouldValidate: true });
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex w-full items-center justify-between gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 items-center gap-2 text-left hover:opacity-80"
        >
          <ChevronRight className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150", expanded && "rotate-90")} />
          <span className="text-sm font-medium">{label}</span>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {pullFromLabel && pullFromEntries && (
            <Button
              size="xs"
              variant="outline"
              disabled={entries.length > 0}
              onClick={() => replace(pullFromEntries.map((e) => ({ ...e })))}
            >
              Pull from {pullFromLabel}
            </Button>
          )}
          <Badge variant="secondary" size="sm">{entries.length} {entries.length === 1 ? "entry" : "entries"}</Badge>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border p-3">
          <Button
            size="xs"
            variant="outline"
            onClick={() => prepend({ repository: "", type: "", value: "", executed: "No" })}
          >
            <Plus className="h-3 w-3" /> Add Entry
          </Button>
          {fields.map((field, i) => {
            const e = entries[i];
            const entryError = Array.isArray(sectionErrors) ? sectionErrors[i] : undefined;
            const rowMessage = entryError?.repository?.message ?? entryError?.type?.message ?? entryError?.value?.message;
            return (
              <div key={field.id} className="space-y-2 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1.6fr_1fr_1fr_auto]">
                  <RepoCombobox repositories={repositories} value={e.repository} onChange={(repo) => updateEntry(i, { repository: repo.slug })} />
                  <OptionCombobox value={e.type} onChange={(v) => updateEntry(i, { type: v })} options={TYPE_OPTIONS} />
                  <OptionCombobox value={e.executed} onChange={(v) => updateEntry(i, { executed: v as ManifestFormValues[typeof envKey][number]["executed"] })} options={EXECUTED_OPTIONS} />
                  <Button size="icon-sm" variant="outline" onClick={() => remove(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Controller
                  control={control}
                  name={`${envKey}.${i}.value`}
                  render={({ field: valueField }) => (
                    <AutoGrowTextarea
                      name={valueField.name}
                      value={valueField.value}
                      onChange={valueField.onChange}
                      onBlur={valueField.onBlur}
                      placeholder="Value"
                      className="bg-card/50 text-xs"
                    />
                  )}
                />
                {rowMessage && <p className="text-xs text-status-error">{rowMessage}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditManifestDialogContent({
  doc,
  repositories,
  onClose,
}: {
  doc: ClickUpManifestPage;
  repositories: Repository[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<Set<keyof ManifestFormValues>>(new Set(["development"]));
  const [savingAction, setSavingAction] = React.useState<"save" | "continue" | null>(null);

  const {
    handleSubmit,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors, isLoading },
  } = useForm<ManifestFormValues>({
    resolver: zodResolver(manifestFormSchema),
    defaultValues: async () => {
      const res = await fetchManifestPageContentAction(doc.id);
      if (!res.ok || !res.data) {
        setLoadError(res.error ?? "Could not load document content");
        return emptyManifestInput();
      }
      return res.data as ManifestInput;
    },
  });

  function toggle(key: keyof ManifestFormValues) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function save(values: ManifestFormValues, closeAfter: boolean) {
    setSaveError(null);
    const res = await saveManifestPageContentAction(doc.id, values as ManifestInput);
    setSavingAction(null);
    if (!res.ok) {
      toast.error(res.error ?? "Could not save document");
      setSaveError(res.error ?? "Could not save document");
      return;
    }
    toast.success(`Manifest saved for ${doc.name}`);
    router.refresh();
    if (closeAfter) onClose();
  }

  function onSaveContinueClick() {
    setSavingAction("continue");
    handleSubmit(
      (values) => save(values, false),
      () => setSavingAction(null),
    )();
  }

  function onSaveClick() {
    setSavingAction("save");
    handleSubmit(
      (values) => save(values, true),
      () => setSavingAction(null),
    )();
  }

  return (
    <DialogContent className="flex h-[min(90vh,860px)] max-w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1200px)]">
      <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
        <DialogTitle className="text-base">{doc.name}</DialogTitle>
        {(loadError || saveError) && <p className="mt-1 text-xs text-status-error">{loadError ?? saveError}</p>}
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading document…</p>
        ) : (
          <div className="space-y-3">
            <label className={fieldLabelCls}>Deployment Manifest</label>
            {ENV_SECTIONS.map(({ key, label }) => (
              <EnvSection
                key={key}
                envKey={key}
                label={label}
                control={control}
                watch={watch}
                setValue={setValue}
                getValues={getValues}
                errors={errors}
                repositories={repositories}
                expanded={expanded.has(key)}
                onToggle={() => toggle(key)}
                pullFromLabel={key !== "development" ? "Development" : undefined}
                pullFromEntries={key !== "development" ? watch("development") : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="outline" size="sm" disabled={savingAction !== null} onClick={onClose}>Cancel</Button>
        <Button size="sm" disabled={isLoading || savingAction !== null} loading={savingAction === "continue"} onClick={onSaveContinueClick}>
          {savingAction === "continue" ? "Saving…" : "Save and Continue Edit"}
        </Button>
        <Button size="sm" disabled={isLoading || savingAction !== null} loading={savingAction === "save"} onClick={onSaveClick}>
          {savingAction === "save" ? "Saving…" : "Save"}
        </Button>
      </div>
    </DialogContent>
  );
}

export function EditManifestDialog({
  doc,
  repositories,
  onClose,
}: {
  doc: ClickUpManifestPage | null;
  repositories: Repository[];
  onClose: () => void;
}) {
  return (
    <Dialog open={!!doc} onOpenChange={(next) => { if (!next) onClose(); }}>
      {doc && <EditManifestDialogContent key={doc.id} doc={doc} repositories={repositories} onClose={onClose} />}
    </Dialog>
  );
}
