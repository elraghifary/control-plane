"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listBranchesAction, generateReleaseNotesAction, publishReleaseAction } from "@/app/(app)/releases/actions";

type BumpType = "minor" | "patch";
type Step = "form" | "confirm" | "publishing" | "done";

function bumpVersion(latestTag: string | null, bump: BumpType): string {
  if (!latestTag) return bump === "minor" ? "v1.0.0" : "v0.0.1";
  const prefix = latestTag.startsWith("v") ? "v" : "";
  const [major = 0, minor = 0, patch = 0] = latestTag.replace(/^v/, "").split(".").map(Number);
  if (bump === "minor") return `${prefix}${major}.${minor + 1}.0`;
  return `${prefix}${major}.${minor}.${patch + 1}`;
}

/** Shared label style used across all form dialogs */
const fieldLabelCls = "mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function PublishReleaseDialog({
  slug,
  latestTag,
  defaultBranch,
}: {
  slug: string;
  latestTag: string | null;
  defaultBranch: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("form");
  const [bump, setBump] = React.useState<BumpType>("minor");
  const [branch, setBranch] = React.useState(defaultBranch);
  const [branchQuery, setBranchQuery] = React.useState("");
  const [branchPopoverOpen, setBranchPopoverOpen] = React.useState(false);
  const [branches, setBranches] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [notesLoading, setNotesLoading] = React.useState(false);
  const [publishResult, setPublishResult] = React.useState<{ tagName: string; htmlUrl: string } | null>(null);
  const [publishError, setPublishError] = React.useState<string | null>(null);

  const computedTag = bumpVersion(latestTag, bump);

  function handleOpen() {
    setStep("form");
    setBump("minor");
    setBranch(defaultBranch);
    setBranchQuery("");
    setNotes("");
    setPublishResult(null);
    setPublishError(null);
    setOpen(true);
    listBranchesAction(slug).then((b) => React.startTransition(() => setBranches(b)));
  }

  const filteredBranches = branches.filter((b) =>
    b.toLowerCase().includes(branchQuery.toLowerCase())
  );

  React.useEffect(() => {
    if (!open || step !== "form") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setNotesLoading(true);
      const generated = await generateReleaseNotesAction(slug, computedTag, branch, latestTag ?? undefined);
      if (!cancelled) {
        setNotes(generated);
        setNotesLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, computedTag, branch]);

  async function publish() {
    setStep("publishing");
    setPublishError(null);
    const res = await publishReleaseAction(slug, computedTag, branch, notes);
    if (res.ok && res.result) {
      router.refresh();
      React.startTransition(() => {
        setPublishResult(res.result!);
        setStep("done");
      });
    } else {
      React.startTransition(() => {
        setPublishError(res.error ?? "Publish failed");
        setStep("confirm");
      });
    }
  }

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        Publish Release
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next && step !== "publishing") setOpen(false); }}>
        <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">

          {/* ── Form step ── */}
          {step === "form" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Publish Release</DialogTitle>
                {latestTag && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current latest: <code className="font-mono">{latestTag}</code>
                  </p>
                )}
              </DialogHeader>

              <div className="relative min-h-0 flex-1 flex flex-col">
                {/* Overlay sits here — outside overflow-y-auto so inset-0 covers the visible box */}
                {notesLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-background/80 backdrop-blur-sm">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-instrument border-t-transparent" />
                    <p className="text-xs text-muted-foreground">Updating notes…</p>
                  </div>
                )}

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-5">
                {/* Bump type */}
                <div>
                  <label className={fieldLabelCls}>Next version</label>
                  <div className="flex gap-2">
                    {(["minor", "patch"] as BumpType[]).map((b) => (
                      <button
                        key={b}
                        onClick={() => setBump(b)}
                        className={[
                          "flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          bump === b
                            ? "border-instrument bg-instrument/10 text-instrument"
                            : "border-border bg-card/50 text-muted-foreground hover:border-instrument/40 hover:text-foreground",
                        ].join(" ")}
                      >
                        <div className="text-xs font-medium capitalize">{b}</div>
                        <div className="mt-0.5 font-mono text-sm font-semibold">
                          {bumpVersion(latestTag, b)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target branch combobox */}
                <div>
                  <label className={fieldLabelCls}>Target branch</label>
                  <Popover modal open={branchPopoverOpen} onOpenChange={(v) => { setBranchPopoverOpen(v); if (!v) setBranchQuery(""); }}>
                    <PopoverTrigger asChild>
                      <button className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 text-sm outline-none transition-colors hover:border-instrument/40 focus:border-instrument/60">
                        <span className={cn("min-w-0 flex-1 truncate text-left font-mono", !branch && "text-muted-foreground")}>
                          {branch || "Select branch…"}
                        </span>
                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                      <div className="border-b border-border px-3 py-2">
                        <input
                          autoFocus
                          value={branchQuery}
                          onChange={(e) => setBranchQuery(e.target.value)}
                          placeholder="Search branch…"
                          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {filteredBranches.length === 0 && !branchQuery && (
                          <p className="px-3 py-2 text-sm text-muted-foreground">No branches found.</p>
                        )}
                        {filteredBranches.map((b) => (
                          <button
                            key={b}
                            onClick={() => { setBranch(b); setBranchQuery(""); setBranchPopoverOpen(false); }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                          >
                            <Check className={cn("h-3.5 w-3.5 shrink-0 text-instrument", branch !== b && "opacity-0")} />
                            <span className="min-w-0 flex-1 break-all font-mono">{b}</span>
                          </button>
                        ))}
                        {filteredBranches.length === 0 && branchQuery && (
                          <button
                            onClick={() => { setBranch(branchQuery); setBranchQuery(""); setBranchPopoverOpen(false); }}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                          >
                            Use &ldquo;<span className="font-mono">{branchQuery}</span>&rdquo;
                          </button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Release notes */}
                <div>
                  <label className={fieldLabelCls}>Release notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={8}
                    className="w-full resize-none rounded-lg border border-border bg-card/50 px-3 py-2 font-mono text-xs outline-none focus:border-instrument/60"
                    placeholder="Release notes will be auto-generated…"
                  />
                </div>
              </div>{/* end scroll */}

              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  disabled={notesLoading || !branch.trim()}
                  onClick={() => setStep("confirm")}
                >
                  Release
                </Button>
              </div>
              </div>{/* end relative wrapper */}
            </>
          )}

          {/* ── Confirm step ── */}
          {step === "confirm" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Confirm Release</DialogTitle>
              </DialogHeader>
              <div className="flex-1 px-5 py-5 space-y-3 text-sm text-muted-foreground">
                <p>
                  Publish{" "}
                  <code className="font-mono font-semibold text-foreground">{computedTag}</code>{" "}
                  from{" "}
                  <code className="font-mono text-foreground">{branch}</code>{" "}
                  as the latest release?
                </p>
                {publishError && (
                  <p className="text-xs text-status-error">{publishError}</p>
                )}
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setStep("form")}>Back</Button>
                <Button size="sm" className="rounded-full" onClick={publish}>
                  Confirm Release
                </Button>
              </div>
            </>
          )}

          {/* ── Publishing step ── */}
          {step === "publishing" && (
            <div className="flex flex-col items-center justify-center gap-3 px-5 py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-instrument border-t-transparent" />
              <p className="text-sm text-muted-foreground">Publishing {computedTag}…</p>
            </div>
          )}

          {/* ── Done step ── */}
          {step === "done" && publishResult && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Release Results</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-2">
                <div className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-1.5">
                  <span className="font-mono text-xs text-foreground">{publishResult.tagName}</span>
                  <div className="flex items-center gap-1.5 text-xs text-status-healthy">
                    <span>Published as latest release</span>
                    <a
                      href={publishResult.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 underline hover:text-foreground"
                    >
                      View on GitHub
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 justify-end border-t border-border px-5 py-4">
                <Button size="sm" className="rounded-full" onClick={() => setOpen(false)}>Done</Button>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
