"use client";

import * as React from "react";
import { Fragment } from "react";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Repository } from "@/lib/data/types";
import { groupRepositories } from "@/components/shell/repository-selector";
import type { ClickUpSprint, ClickUpMember } from "@/lib/clickup/types";
import type { SignoffPerson, SignoffTaskRow } from "@/lib/clickup/signoff-markdown";
import {
  listSignoffSprintsAction,
  listSignoffMembersAction,
  listSignoffTasksAction,
  getLatestTagAction,
  createSignoffAction,
  shareSignoffAction,
} from "@/app/(app)/sign-offs/actions";

type Step = "form" | "done";

const EMPTY_PERSON: SignoffPerson = { name: "", email: "" };
const QA_MEMBER: SignoffPerson = { name: "Wahid Ramadhan", email: "wahid@happykids.id" };
const PRODUCT_MEMBER: SignoffPerson = { name: "Ardy Adlie", email: "ardy@happykids.id" };
const SIGNOFF_CONTACT: SignoffPerson = { name: "Elra Ghifary", email: "elra@happykids.id" };

interface ServiceRow {
  repoSlug: string;
  service: string;
  latestTag: string | null;
  tagLoading: boolean;
  version: string;
  type: string;
  pic: SignoffPerson;
}

function emptyServiceRow(): ServiceRow {
  return { repoSlug: "", service: "", latestTag: null, tagLoading: false, version: "", type: "Update", pic: EMPTY_PERSON };
}

function bumpVersion(latestTag: string | null, bump: "minor" | "patch"): string {
  if (!latestTag) return bump === "minor" ? "v1.0.0" : "v0.0.1";
  const prefix = latestTag.startsWith("v") ? "v" : "";
  const [major = 0, minor = 0, patch = 0] = latestTag.replace(/^v/, "").split(".").map(Number);
  if (bump === "minor") return `${prefix}${major}.${minor + 1}.0`;
  return `${prefix}${major}.${minor}.${patch + 1}`;
}

function titleCaseFromSlug(name: string): string {
  return name.split("-").map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

function today(): string {
  return toIsoDate(new Date());
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSignoffDate(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  const monthName = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  return `${monthName}, ${day} ${year}`;
}

function sprintSortKey(name: string): number {
  const match = name.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : -1;
}

function sortSprintsLatestFirst(sprints: ClickUpSprint[]): ClickUpSprint[] {
  return [...sprints].sort((a, b) => sprintSortKey(b.name) - sprintSortKey(a.name));
}

const fieldLabelCls = "mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

function SprintCombobox({
  sprints,
  value,
  onChange,
  loading,
  error,
}: {
  sprints: ClickUpSprint[];
  value: ClickUpSprint | null;
  onChange: (sprint: ClickUpSprint) => void;
  loading: boolean;
  error: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const sorted = sortSprintsLatestFirst(sprints);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={loading}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-instrument/40 disabled:opacity-50"
        >
          <span className={cn("min-w-0 flex-1 truncate text-left", !value && "text-muted-foreground")}>
            {loading ? "Loading sprints…" : value?.name || "Select sprint"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandEmpty>{error ?? "No sprints found."}</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {sorted.map((s) => (
                <CommandItem key={s.id} value={s.name} onSelect={() => { onChange(s); setOpen(false); }}>
                  <Check className={cn("size-4", s.id === value?.id ? "opacity-100" : "opacity-0")} />
                  {s.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RepoCombobox({
  repositories,
  value,
  onChange,
}: {
  repositories: Repository[];
  value: string;
  onChange: (repo: Repository) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const groups = groupRepositories(repositories);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-instrument/40"
        >
          <span className={cn("min-w-0 flex-1 truncate text-left", !value && "text-muted-foreground")}>
            {value || "Select repository"}
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
                    <CommandItem key={repo.slug} value={repo.slug} onSelect={() => { onChange(repo); setOpen(false); }}>
                      <Check className={cn("size-4", repo.slug === value ? "opacity-100" : "opacity-0")} />
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

function OptionCombobox({
  options,
  value,
  onChange,
  disabled,
  loading,
  placeholder = "Select…",
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-instrument/40 disabled:opacity-50"
        >
          <span className={cn("min-w-0 flex-1 truncate text-left", !current && "text-muted-foreground")}>
            {loading ? "Loading…" : (current?.label ?? placeholder)}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={o.label} onSelect={() => { onChange(o.value); setOpen(false); }}>
                  <Check className={cn("size-4", o.value === value ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MemberPicker({
  members,
  value,
  onChange,
  placeholder = "Select member…",
}: {
  members: ClickUpMember[];
  value: SignoffPerson;
  onChange: (person: SignoffPerson) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-instrument/40"
        >
          <span className={cn("min-w-0 flex-1 truncate text-left", !value.email && "text-muted-foreground")}>
            {value.name || placeholder}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandEmpty>No members found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {members.map((m) => (
                <CommandItem
                  key={m.id}
                  value={`${m.name} ${m.email}`}
                  onSelect={() => { onChange({ name: m.name, email: m.email }); setOpen(false); }}
                >
                  <Check className={cn("size-4 shrink-0", value.email === m.email ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MultiSelectCombobox({
  options,
  values,
  onChange,
  placeholder = "Select…",
}: {
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.filter((o) => values.includes(o.value));

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-sm transition-colors hover:border-instrument/40"
        >
          {selected.length === 0 ? (
            <span className="flex-1 text-left text-muted-foreground">{placeholder}</span>
          ) : (
            selected.map((o) => (
              <Badge key={o.value} variant="secondary" className="gap-1 pr-1">
                {o.label}
                <span
                  role="button"
                  tabIndex={-1}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); toggle(o.value); }}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <X className="h-2.5 w-2.5" />
                </span>
              </Badge>
            ))
          )}
          <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                  <Check className={cn("size-4", values.includes(o.value) ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DatePicker({ value, onChange }: { value: string; onChange: (isoDate: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-instrument/40"
        >
          <span className="truncate">{value ? formatSignoffDate(value) : "Select date"}</span>
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => { if (date) { onChange(toIsoDate(date)); setOpen(false); } }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function CreateSignoffDialog({ repositories }: { repositories: Repository[] }) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("form");
  const [submitting, setSubmitting] = React.useState(false);

  const [sprints, setSprints] = React.useState<ClickUpSprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = React.useState(false);
  const [sprintsError, setSprintsError] = React.useState<string | null>(null);
  const [selectedSprint, setSelectedSprint] = React.useState<ClickUpSprint | null>(null);

  const [members, setMembers] = React.useState<ClickUpMember[]>([]);

  function assigneeOptions(assigneeEmails: string[]) {
    const known = new Set(members.map((m) => m.email));
    const extra = assigneeEmails.filter((email) => !known.has(email)).map((email) => ({ value: email, label: email }));
    return [...members.map((m) => ({ value: m.email, label: m.name })), ...extra];
  }

  const [deploymentDate, setDeploymentDate] = React.useState(today());
  const [services, setServices] = React.useState<ServiceRow[]>([emptyServiceRow()]);
  const [tasks, setTasks] = React.useState<SignoffTaskRow[]>([]);
  const [tasksLoading, setTasksLoading] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  const [error, setError] = React.useState<string | null>(null);
  const [resultUrl, setResultUrl] = React.useState<string | null>(null);
  const [sharing, setSharing] = React.useState(false);
  const [shared, setShared] = React.useState(false);

  function handleOpen() {
    setStep("form");
    setSubmitting(false);
    setSelectedSprint(null);
    setDeploymentDate(today());
    setServices([emptyServiceRow()]);
    setTasks([]);
    setNotes("");
    setError(null);
    setResultUrl(null);
    setSharing(false);
    setShared(false);
    setOpen(true);

    setSprintsLoading(true);
    setSprintsError(null);
    listSignoffSprintsAction().then((res) => {
      setSprintsLoading(false);
      if (!res.ok) { setSprintsError(res.error ?? "Could not load sprints"); return; }
      setSprints(res.sprints);
    });
    listSignoffMembersAction().then((res) => {
      if (res.ok) setMembers(res.members);
    });
  }

  async function selectSprint(sprint: ClickUpSprint) {
    setSelectedSprint(sprint);
    setTasksLoading(true);
    const res = await listSignoffTasksAction(sprint.id);
    setTasksLoading(false);
    if (res.ok) setTasks(res.tasks.map((t) => ({ name: t.name, url: t.url, assigneeEmails: t.assigneeEmails })));
  }

  function updateService(index: number, patch: Partial<ServiceRow>) {
    setServices((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function addService() {
    setServices((prev) => [...prev, emptyServiceRow()]);
  }
  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  async function selectServiceRepo(index: number, repo: Repository) {
    updateService(index, { repoSlug: repo.slug, service: titleCaseFromSlug(repo.name), tagLoading: true });
    const latestTag = await getLatestTagAction(repo.slug);
    updateService(index, { latestTag, tagLoading: false, version: bumpVersion(latestTag, "minor") });
  }

  function updateTask(index: number, patch: Partial<SignoffTaskRow>) {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }
  function addTask() {
    setTasks((prev) => [...prev, { name: "", url: "", assigneeEmails: [] }]);
  }
  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  const canSubmit = !!selectedSprint && services.every((s) => s.service.trim() && s.version.trim() && s.pic.email);

  async function submit() {
    if (!selectedSprint || !canSubmit) return;
    setError(null);
    setSubmitting(true);
    const res = await createSignoffAction({
      deploymentDate: formatSignoffDate(deploymentDate),
      sprintName: selectedSprint.name,
      services: services.map((s) => ({ service: s.service, version: s.version, type: s.type, pic: s.pic })),
      tasks,
      qaMembers: [{ ...QA_MEMBER, date: formatSignoffDate(deploymentDate) }],
      productMembers: [{ ...PRODUCT_MEMBER, date: formatSignoffDate(deploymentDate) }],
      postDeployExecuted: false,
      postDeploySmokeTest: false,
      postDeployMonitoring: false,
      notes,
      contact: SIGNOFF_CONTACT,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Could not create sign-off doc");
      toast.error(res.error ?? "Could not create sign-off doc");
      return;
    }
    setResultUrl(res.url ?? null);
    setStep("done");
  }

  async function share() {
    if (!resultUrl || !selectedSprint) return;
    setSharing(true);
    const res = await shareSignoffAction(selectedSprint.name, resultUrl);
    setSharing(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not share to Product Sync");
      return;
    }
    setShared(true);
    toast.success("Shared to Product Sync");
  }

  return (
    <>
      <Button size="sm" onClick={handleOpen}>Create Sign-off</Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next && !submitting) setOpen(false); }}>
        <DialogContent
          className={cn(
            "flex flex-col gap-0 overflow-hidden p-0",
            step === "form"
              ? "h-[min(90vh,860px)] max-w-[min(96vw,1200px)] sm:max-w-[min(96vw,1200px)]"
              : "max-w-md",
          )}
          showCloseButton
        >
          {step === "form" ? (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Create Deployment Sign-off</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={fieldLabelCls}>Sprint</label>
                    <SprintCombobox sprints={sprints} value={selectedSprint} onChange={selectSprint} loading={sprintsLoading} error={sprintsError} />
                  </div>
                  <div>
                    <label className={fieldLabelCls}>Deployment Date</label>
                    <DatePicker value={deploymentDate} onChange={setDeploymentDate} />
                  </div>
                </div>

                {/* Deployment scope */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Deployment Scope</label>
                    <Button size="xs" variant="outline" onClick={addService}><Plus className="h-3 w-3" /> Add Service</Button>
                  </div>
                  <div className="space-y-3">
                    {services.map((s, i) => (
                      <div key={i} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-border bg-card/40 p-3 sm:grid-cols-[1.5fr_1.3fr_1fr_1.5fr_auto]">
                        <RepoCombobox repositories={repositories} value={s.repoSlug} onChange={(repo) => selectServiceRepo(i, repo)} />
                        <OptionCombobox
                          value={s.version}
                          disabled={s.tagLoading || !s.repoSlug}
                          loading={s.tagLoading}
                          onChange={(v) => updateService(i, { version: v })}
                          placeholder={s.repoSlug ? "Version" : "Select repository first"}
                          options={[
                            ...(s.latestTag ? [{ value: s.latestTag, label: `${s.latestTag} (current)` }] : []),
                            { value: bumpVersion(s.latestTag, "patch"), label: `${bumpVersion(s.latestTag, "patch")} (patch)` },
                            { value: bumpVersion(s.latestTag, "minor"), label: `${bumpVersion(s.latestTag, "minor")} (minor)` },
                          ]}
                        />
                        <OptionCombobox
                          value={s.type}
                          onChange={(v) => updateService(i, { type: v })}
                          options={[
                            { value: "Update", label: "Update" },
                            { value: "New", label: "New" },
                            { value: "Fix", label: "Fix" },
                          ]}
                        />
                        <MemberPicker members={members} value={s.pic} onChange={(p) => updateService(i, { pic: p })} placeholder="PIC" />
                        <Button size="icon-sm" variant="outline" disabled={services.length === 1} onClick={() => removeService(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task list */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Task List</label>
                    <Button size="xs" variant="outline" onClick={addTask}><Plus className="h-3 w-3" /> Add Task</Button>
                  </div>
                  {tasksLoading ? (
                    <p className="text-sm text-muted-foreground">Loading tasks…</p>
                  ) : (
                    <div className="space-y-3">
                      {tasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks found for this sprint.</p>}
                      {tasks.map((t, i) => (
                        <div key={i} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-border bg-card/40 p-3 sm:grid-cols-[2fr_2fr_1.5fr_auto]">
                          <Input placeholder="Task name" value={t.name} onChange={(e) => updateTask(i, { name: e.target.value })} />
                          <Input placeholder="Task URL" value={t.url} onChange={(e) => updateTask(i, { url: e.target.value })} />
                          <MultiSelectCombobox
                            options={assigneeOptions(t.assigneeEmails)}
                            values={t.assigneeEmails}
                            onChange={(vals) => updateTask(i, { assigneeEmails: vals })}
                            placeholder="Assignees"
                          />
                          <Button size="icon-sm" variant="outline" onClick={() => removeTask(i)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fixed sign-off people */}
                <div className="rounded-lg border border-border bg-card/40 p-3 text-xs text-muted-foreground space-y-1">
                  <p>QA Team: <span className="text-foreground">{QA_MEMBER.name}</span> ({QA_MEMBER.email})</p>
                  <p>Product Team: <span className="text-foreground">{PRODUCT_MEMBER.name}</span> ({PRODUCT_MEMBER.email})</p>
                  <p>Sign-off Contact: <span className="text-foreground">{SIGNOFF_CONTACT.name}</span> ({SIGNOFF_CONTACT.email})</p>
                </div>

                {/* Notes */}
                <div>
                  <label className={fieldLabelCls}>Note / Remarks</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional additional comments, follow-up tasks, or known issues." />
                </div>

                {error && <p className="text-xs text-status-error">{error}</p>}
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" disabled={submitting} onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" disabled={!canSubmit} loading={submitting} onClick={submit}>
                  {submitting ? "Creating…" : "Create"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Sign-off Created</DialogTitle>
              </DialogHeader>
              <div className="px-5 py-5">
                <div className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-status-healthy">
                    <span>Document created in ClickUp</span>
                    {resultUrl && (
                      <a href={resultUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline hover:text-foreground">
                        Open Document <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" disabled={shared} loading={sharing} onClick={share}>
                  {shared ? "Shared" : sharing ? "Sharing…" : "Share To Product Sync"}
                </Button>
                <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
