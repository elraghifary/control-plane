"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import type { Repository } from "@/lib/data/types";
import type { StagingCreateResult } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { prepareStagingPR, mergePullRequest } from "@/app/(app)/pull-requests/actions";

type Step = "select" | "confirm" | "running" | "done";

export function SyncStagingDialog({
  repositories,
  selectedSlug,
}: {
  repositories: Repository[];
  selectedSlug: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("select");
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [results, setResults] = React.useState<StagingCreateResult[]>([]);
  const [currentMsg, setCurrentMsg] = React.useState("");

  function handleOpen() {
    setStep("select");
    setChecked(new Set([selectedSlug].filter(Boolean)));
    setResults([]);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  const allChecked = repositories.length > 0 && repositories.every((r) => checked.has(r.slug));
  const someChecked = repositories.some((r) => checked.has(r.slug));

  function toggleAll(value: boolean) {
    setChecked(value ? new Set(repositories.map((r) => r.slug)) : new Set());
  }

  function toggleRepo(slug: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  async function runSync() {
    setStep("running");
    setResults([]);
    const slugsArr = [...checked];
    const all: StagingCreateResult[] = [];
    for (let i = 0; i < slugsArr.length; i++) {
      const slug = slugsArr[i];
      const suffix = slugsArr.length > 1 ? ` (${i + 1}/${slugsArr.length})` : "";
      setCurrentMsg(`Creating pull request…${suffix}`);
      const prep = await prepareStagingPR(slug);
      if (prep.alreadySynced) {
        all.push({ slug, created: false, merged: false, alreadySynced: true });
        continue;
      }
      if (prep.error || !prep.prNumber) {
        all.push({ slug, created: false, merged: false, error: prep.error ?? "Failed to create pull request" });
        continue;
      }
      setCurrentMsg(`Merging pull request…${suffix}`);
      const mergeRes = await mergePullRequest(slug, prep.prNumber);
      all.push({
        slug,
        created: prep.created ?? false,
        merged: mergeRes.ok,
        prUrl: prep.prUrl,
        error: mergeRes.ok ? undefined : (mergeRes.error ?? "Merge failed"),
      });
    }
    setResults(all);
    setStep("done");
  }

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        Sync Staging
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
        <DialogContent className="flex max-h-[90vh] max-w-sm flex-col gap-0 overflow-hidden p-0">

          {/* ── Select step ── */}
          {step === "select" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Sync Development → Staging</DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  A pull request will be opened from <code className="font-mono">development</code> → <code className="font-mono">staging</code> for each selected repository.
                </p>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {/* Select all */}
                <label className="flex cursor-pointer items-center gap-3 border-b border-border pb-2.5 mb-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded accent-instrument"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  <span className="text-sm font-medium">All repositories</span>
                  <span className="ml-auto text-xs text-muted-foreground">{checked.size}/{repositories.length}</span>
                </label>

                {/* Repository list */}
                <div className="space-y-1">
                  {repositories.map((r) => (
                    <label key={r.slug} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded accent-instrument"
                        checked={checked.has(r.slug)}
                        onChange={() => toggleRepo(r.slug)}
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs">{r.slug}</span>
                      {r.slug === selectedSlug && (
                        <span className="shrink-0 text-[10px] text-instrument">current</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" className="rounded-full" onClick={handleClose}>Cancel</Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  disabled={checked.size === 0}
                  onClick={() => setStep("confirm")}
                >
                  Sync
                </Button>
              </div>
            </>
          )}

          {/* ── Confirm step ── */}
          {step === "confirm" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Confirm Sync</DialogTitle>
              </DialogHeader>
              <div className="flex-1 px-5 py-5 text-sm text-muted-foreground space-y-3">
                <p>
                  Open a <code className="font-mono text-foreground">development → staging</code> pull request for{" "}
                  <strong className="text-foreground">{checked.size} {checked.size === 1 ? "repository" : "repositories"}</strong>?
                </p>
                <ul className="space-y-1 font-mono text-xs">
                  {[...checked].map((slug) => (
                    <li key={slug} className="text-muted-foreground">· {slug}</li>
                  ))}
                </ul>
                <p className="text-xs">If an open pull request already exists, you will be shown its URL instead.</p>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setStep("select")}>Back</Button>
                <Button size="sm" className="rounded-full" onClick={runSync}>
                  Confirm Sync
                </Button>
              </div>
            </>
          )}

          {/* ── Running step ── */}
          {step === "running" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-instrument border-t-transparent" />
              <p className="text-sm text-muted-foreground">{currentMsg}</p>
            </div>
          )}

          {/* ── Done step ── */}
          {step === "done" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Sync Results</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {results.map((r) => (
                  <div key={r.slug} className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-1.5">
                    <span className="font-mono text-xs text-foreground">{r.slug}</span>
                    {r.alreadySynced ? (
                      <p className="text-xs text-muted-foreground">Already in sync — no changes to merge.</p>
                    ) : r.merged && r.prUrl ? (
                      <div className="flex items-center gap-1.5 text-xs text-status-healthy">
                        <span>Merged</span>
                        <a
                          href={r.prUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline hover:text-foreground"
                        >
                          View pull request <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-status-error">{r.error ?? "Failed"}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 justify-end border-t border-border px-5 py-4">
                <Button size="sm" className="rounded-full" onClick={handleClose}>Done</Button>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
