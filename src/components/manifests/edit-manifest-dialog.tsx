"use client";

import * as React from "react";
import { Fragment } from "react";
import { z } from "zod";
import { useForm, useFieldArray, Controller, type Control, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, ChevronsUpDown, Layers, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { RepoCombobox, OptionCombobox } from "@/components/clickup/comboboxes";
import { groupRepositories } from "@/components/shell/repository-selector";
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
type EnvSectionHandle = { validateBatch: () => boolean };

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

function MultiRepoCombobox({
  repositories,
  selected,
  onToggle,
}: {
  repositories: Repository[];
  selected: Set<string>;
  onToggle: (slug: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const groups = groupRepositories(repositories);
  const selectedList = [...selected];
  const label =
    selectedList.length === 0
      ? "Select repositories"
      : selectedList.length === 1
        ? selectedList[0]
        : `${selectedList.length} repositories`;

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-instrument/40"
        >
          <span className={cn("min-w-0 flex-1 truncate text-left", selectedList.length === 0 && "text-muted-foreground")}>
            {label}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandEmpty>No repositories found.</CommandEmpty>
          <CommandList>
            {groups.map((group, i) => (
              <Fragment key={group.label}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={group.label}>
                  {group.repos.map((repo) => (
                    <CommandItem key={repo.slug} value={repo.slug} onSelect={() => onToggle(repo.slug)}>
                      <Check className={cn("size-4", selected.has(repo.slug) ? "opacity-100" : "opacity-0")} />
                      {repo.slug}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function BatchEntryRow({
  repositories,
  selected,
  onToggleRepo,
  type,
  onTypeChange,
  value,
  onValueChange,
  executed,
  onExecutedChange,
  touched,
  onConfirm,
  onCancel,
}: {
  repositories: Repository[];
  selected: Set<string>;
  onToggleRepo: (slug: string) => void;
  type: string;
  onTypeChange: (v: string) => void;
  value: string;
  onValueChange: (v: string) => void;
  executed: "Yes" | "No";
  onExecutedChange: (v: "Yes" | "No") => void;
  touched: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const canSubmit = selected.size > 0 && type !== "" && value.trim() !== "";
  const rowMessage = !touched
    ? undefined
    : selected.size === 0
      ? "Select at least one repository"
      : type === ""
        ? "Type is required"
        : value.trim() === ""
          ? "Value is required"
          : undefined;

  return (
    <div className="space-y-2 border-b border-border pb-3">
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1.6fr_1fr_1fr_auto]">
        <MultiRepoCombobox repositories={repositories} selected={selected} onToggle={onToggleRepo} />
        <OptionCombobox value={type} onChange={onTypeChange} options={TYPE_OPTIONS} />
        <OptionCombobox value={executed} onChange={(v) => onExecutedChange(v as "Yes" | "No")} options={EXECUTED_OPTIONS} />
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="outline" disabled={!canSubmit} onClick={onConfirm}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="outline" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Value"
        rows={3}
        className="bg-card/50 text-xs placeholder:text-sm"
      />
      {rowMessage ? (
        <p className="text-xs text-status-error">{rowMessage}</p>
      ) : selected.size > 0 ? (
        <p className="text-xs text-muted-foreground">{selected.size} {selected.size === 1 ? "repository" : "repositories"} selected</p>
      ) : null}
    </div>
  );
}

const EnvSection = React.forwardRef<EnvSectionHandle, {
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
}>(function EnvSection(
  {
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
  },
  ref,
) {
  const { fields, prepend, remove, replace } = useFieldArray({ control, name: envKey });
  const entries = watch(envKey);
  const sectionErrors = errors[envKey];

  const [batchOpen, setBatchOpen] = React.useState(false);
  const [batchSelected, setBatchSelected] = React.useState<Set<string>>(new Set());
  const [batchType, setBatchType] = React.useState("");
  const [batchValue, setBatchValue] = React.useState("");
  const [batchExecuted, setBatchExecuted] = React.useState<"Yes" | "No">("No");
  const [batchTouched, setBatchTouched] = React.useState(false);

  function toggleBatchRepo(slug: string) {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  function resetBatch() {
    setBatchSelected(new Set());
    setBatchType("");
    setBatchValue("");
    setBatchExecuted("No");
    setBatchTouched(false);
  }

  function confirmBatch() {
    prepend([...batchSelected].map((repository) => ({ repository, type: batchType, value: batchValue, executed: batchExecuted })));
    setBatchOpen(false);
    resetBatch();
  }

  const batchValid = batchSelected.size > 0 && batchType !== "" && batchValue.trim() !== "";

  React.useImperativeHandle(ref, () => ({
    validateBatch() {
      if (!batchOpen) return true;
      if (batchValid) {
        confirmBatch();
        return true;
      }
      setBatchTouched(true);
      return false;
    },
  }));

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
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => prepend({ repository: "", type: "", value: "", executed: "No" })}
            >
              <Plus className="h-3 w-3" /> Add Entry
            </Button>
            <Button size="xs" variant="outline" onClick={() => setBatchOpen((v) => !v)}>
              <Layers className="h-3 w-3" /> Add Entries
            </Button>
          </div>
          {batchOpen && (
            <BatchEntryRow
              repositories={repositories}
              selected={batchSelected}
              onToggleRepo={toggleBatchRepo}
              type={batchType}
              onTypeChange={setBatchType}
              value={batchValue}
              onValueChange={setBatchValue}
              executed={batchExecuted}
              onExecutedChange={setBatchExecuted}
              touched={batchTouched}
              onConfirm={confirmBatch}
              onCancel={() => { setBatchOpen(false); resetBatch(); }}
            />
          )}
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
});

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
  const sectionRefs = React.useRef<Partial<Record<keyof ManifestFormValues, EnvSectionHandle | null>>>({});

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

  function validateBatches(): boolean {
    const results = ENV_SECTIONS.map(({ key }) => sectionRefs.current[key]?.validateBatch() ?? true);
    return results.every(Boolean);
  }

  function onSaveContinueClick() {
    if (!validateBatches()) return;
    setSavingAction("continue");
    handleSubmit(
      (values) => save(values, false),
      () => setSavingAction(null),
    )();
  }

  function onSaveClick() {
    if (!validateBatches()) return;
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
                ref={(el) => { sectionRefs.current[key] = el; }}
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
