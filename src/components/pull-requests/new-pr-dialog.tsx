"use client";

import * as React from "react";
import { Check, ChevronsUpDown, ExternalLink, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KineticTextLoader } from "@/components/ui/kinetic-text-loader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownView } from "./markdown-view";
import { listBranchesAction, compareBranchesAction, createPullRequestAction } from "@/app/(app)/pull-requests/actions";
import type { PullRequestFileChange } from "@/lib/data/types";

const fieldLabelCls = "mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

// ── Diff patch renderer (same as pr-files-viewer) ─────────────────────────────

function DiffPatch({ patch }: { patch?: string }) {
  if (!patch) {
    return <p className="px-4 py-3 text-xs text-muted-foreground">Binary or too large to display.</p>;
  }
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
      {patch.trimEnd().split("\n").map((line, i) => (
        <div
          key={i}
          className={cn(
            "break-words px-4 py-0.5",
            line.startsWith("+") && !line.startsWith("+++") && "bg-status-healthy/10 text-status-healthy",
            line.startsWith("-") && !line.startsWith("---") && "bg-status-error/10 text-status-error",
            line.startsWith("@@") && "bg-muted/60 text-instrument",
          )}
        >
          {line || " "}
        </div>
      ))}
    </pre>
  );
}

// ── Diff viewer ───────────────────────────────────────────────────────────────

function DiffViewer({
  files,
  loading,
  head,
  base,
}: {
  files: PullRequestFileChange[];
  loading: boolean;
  head: string;
  base: string;
}) {
  const [collapsed, setCollapsed] = React.useState(new Set<number>());

  function toggle(i: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  }

  if (!head || !base || head === base) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-xs text-muted-foreground">
        Choose different branches or forks above to discuss and review changes.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <KineticTextLoader className="scale-[0.4]" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-xs text-muted-foreground">
        No changes between these branches.
      </div>
    );
  }

  const additions = files.reduce((s, f) => s + f.additions, 0);
  const deletions = files.reduce((s, f) => s + f.deletions, 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted px-4 py-2.5 text-xs text-muted-foreground">
        <span>{files.length} file{files.length !== 1 ? "s" : ""} changed</span>
        <span className="tabular-nums">
          <span className="text-status-healthy">+{additions}</span>
          {" "}
          <span className="text-status-error">−{deletions}</span>
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {files.map((file, i) => (
          <div key={i} className="border-b border-border/50 last:border-0">
            <button
              type="button"
              onClick={() => toggle(i)}
              className={cn(
                "sticky top-0 z-10 flex w-full items-center justify-between gap-2 border-b border-border/40 bg-card/95 px-4 py-2.5 backdrop-blur-sm hover:bg-muted/30",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                    !collapsed.has(i) && "rotate-90",
                  )}
                />
                <span className="min-w-0 break-all text-left font-mono text-[11px]">{file.filename}</span>
              </span>
              <span className="ml-2 flex shrink-0 items-center gap-1">
                {file.status !== "modified" && (
                  <Badge variant="secondary" size="sm">{file.status}</Badge>
                )}
                <Badge variant="healthy" size="sm">+{file.additions}</Badge>
                <Badge variant="error" size="sm">−{file.deletions}</Badge>
              </span>
            </button>
            {!collapsed.has(i) && (
              <div className="bg-background/40">
                {file.previousFilename && (
                  <p className="border-b border-border px-4 py-1.5 font-mono text-[11px] text-muted-foreground">
                    renamed from {file.previousFilename}
                  </p>
                )}
                <DiffPatch patch={file.patch} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Branch combobox ───────────────────────────────────────────────────────────

function BranchCombobox({
  branches,
  value,
  onChange,
  placeholder,
}: {
  branches: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const filtered = branches.filter((b) => b.toLowerCase().includes(query.toLowerCase()));

  return (
    <Popover modal open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <PopoverTrigger asChild>
        <button className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-instrument/40">
          <span className={cn("min-w-0 flex-1 truncate text-left font-mono text-xs", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <div className="border-b border-border px-3 py-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search branch…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No branches found.</p>
          ) : (
            filtered.map((b) => (
              <button
                key={b}
                onClick={() => { onChange(b); setQuery(""); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0 text-instrument", value !== b && "opacity-0")} />
                <span className="min-w-0 flex-1 break-all font-mono text-xs">{b}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────

type Step = "form" | "creating" | "done";

export function NewPrDialog({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("form");
  const [branches, setBranches] = React.useState<string[]>([]);
  const [head, setHead] = React.useState("");
  const [base, setBase] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [preview, setPreview] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{ number: number; htmlUrl: string } | null>(null);
  const [diffFiles, setDiffFiles] = React.useState<PullRequestFileChange[]>([]);
  const [diffLoading, setDiffLoading] = React.useState(false);
  const [branchTouched, setBranchTouched] = React.useState(false);

  async function handleOpen() {
    setStep("form");
    setHead("");
    setBase("");
    setTitle("");
    setBody("");
    setPreview(false);
    setError("");
    setResult(null);
    setDiffFiles([]);
    setBranchTouched(false);
    setOpen(true);
    const b = await listBranchesAction(slug);
    setBranches(b);
    if (b.includes("development")) { setBase("development"); setHead("development"); }
  }

  React.useEffect(() => {
    if (!open || !head || !base || head === base) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setDiffLoading(true);
      compareBranchesAction(slug, base, head).then((files) => {
        if (!cancelled) { setDiffFiles(files); setDiffLoading(false); }
      });
    }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [slug, head, base, open]);

  async function handleSubmit() {
    if (!head || !base || !title.trim()) return;
    setError("");
    setStep("creating");
    const res = await createPullRequestAction(slug, title.trim(), head, base, body);
    if (res.ok && res.number && res.htmlUrl) {
      router.refresh();
      setResult({ number: res.number, htmlUrl: res.htmlUrl });
      setStep("done");
    } else {
      setError(res.error ?? "Failed to create pull request");
      setStep("form");
    }
  }

  const sameBranch = !!head && !!base && head === base;
  const canSubmit = !!head && !!base && !!title.trim() && !sameBranch;

  return (
    <>
      <Button size="sm" className="" onClick={handleOpen}>
        New Pull Request
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v && step !== "creating") setOpen(false); }}>
        <DialogContent className="flex h-[min(90vh,860px)] w-[min(96vw,1200px)] max-w-full flex-col gap-0 p-0 sm:max-w-[min(96vw,1200px)]">

          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle>
              {step === "done" ? "Pull Request Created" : "New Pull Request"}
            </DialogTitle>
          </DialogHeader>

          {/* ── Done step ── */}
          {step === "done" && result ? (
            <>
              <div className="px-5 py-5">
                <div className="space-y-1 rounded-lg border border-border bg-card/50 px-4 py-3">
                  <p className="text-xs text-muted-foreground">#{result.number}</p>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="font-mono text-xs text-muted-foreground">{base} ← {head}</p>
                </div>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <a href={result.htmlUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    View on GitHub <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
                <Button size="sm" className="" onClick={() => setOpen(false)}>Done</Button>
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">

              <div className="flex min-h-0 flex-1 flex-col sm:flex-row">

              {/* ── Form ── */}
              <div className="flex shrink-0 flex-col border-b border-border sm:w-80 sm:border-b-0 sm:border-r">
                <div className="overflow-y-auto px-5 py-5 space-y-5 sm:min-h-0 sm:flex-1">

                  <div>
                    <label className={fieldLabelCls}>Base</label>
                    <BranchCombobox branches={branches} value={base} onChange={(v) => { setBase(v); setBranchTouched(true); }} placeholder="destination…" />
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <label className={cn(fieldLabelCls, "mb-0")}>Compare</label>
                    </div>
                    <BranchCombobox branches={branches} value={head} onChange={(v) => { setHead(v); setBranchTouched(true); }} placeholder="source…" />
                    {branchTouched && sameBranch && (
                      <p className="mt-2 text-xs text-status-error">Base and compare must be different branches.</p>
                    )}
                  </div>

                  <div>
                    <label className={fieldLabelCls}>Title *</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Title"
                      className="bg-card/40"
                    />
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Description
                      </label>
                      <div className="flex rounded-lg border border-border text-xs">
                        <button
                          onClick={() => setPreview(false)}
                          className={cn("px-2.5 py-1 transition-colors", !preview ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                          Write
                        </button>
                        <button
                          onClick={() => setPreview(true)}
                          className={cn("border-l border-border px-2.5 py-1 transition-colors", preview ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                          Preview
                        </button>
                      </div>
                    </div>
                    {preview ? (
                      <div className="min-h-[120px] rounded-lg border border-border bg-card/40 px-3 py-2 text-sm">
                        {body.trim() ? <MarkdownView content={body} /> : (
                          <p className="text-muted-foreground">Nothing to preview.</p>
                        )}
                      </div>
                    ) : (
                      <Textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Add your description here…"
                        rows={6}
                        className="bg-card/40"
                      />
                    )}
                  </div>

                  {error && <p className="text-xs text-status-error">{error}</p>}
                </div>
              </div>

              {/* ── Diff ── */}
              <div className="flex min-h-0 flex-1 flex-col" style={{ minHeight: "200px" }}>
                <DiffViewer files={diffFiles} loading={diffLoading} head={head} base={base} />
              </div>

              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={step === "creating"}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={!canSubmit || step === "creating"}>
                  {step === "creating" ? "Creating…" : "Create pull request"}
                </Button>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
