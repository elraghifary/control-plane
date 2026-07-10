"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { prepareBranchSyncPR, mergePullRequest } from "@/app/(app)/pull-requests/actions";

const WEBSITE_SLUG = "happykids-id/website";

const BRANCHES = ["konsul", "mitra", "dapur"];

type Step = "select" | "confirm" | "done";

interface BranchSyncResult {
  branch: string;
  merged: boolean;
  alreadySynced?: boolean;
  prUrl?: string;
  error?: string;
}

const syncSchema = z.object({
  branches: z.array(z.string()).min(1, "Select at least one branch"),
});

type SyncValues = z.infer<typeof syncSchema>;

export function SyncWebsiteDialog() {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("select");
  const [results, setResults] = React.useState<BranchSyncResult[]>([]);
  const [syncing, setSyncing] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SyncValues>({
    resolver: zodResolver(syncSchema),
    defaultValues: { branches: [] },
  });

  const branches = watch("branches");
  const checked = new Set(branches);

  function handleOpen() {
    setStep("select");
    reset({ branches: [] });
    setResults([]);
    setSyncing(false);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  const allChecked = checked.size === BRANCHES.length;
  const someChecked = checked.size > 0;

  function toggleAll(value: boolean) {
    setValue("branches", value ? BRANCHES : [], { shouldValidate: true });
  }

  function goToConfirm() {
    setStep("confirm");
  }

  async function runSync(values: SyncValues) {
    setSyncing(true);
    setResults([]);
    const all: BranchSyncResult[] = [];
    for (const branch of values.branches) {
      const prep = await prepareBranchSyncPR(WEBSITE_SLUG, branch);
      if (prep.alreadySynced) {
        all.push({ branch, merged: false, alreadySynced: true });
        continue;
      }
      if (prep.error || !prep.prNumber) {
        all.push({ branch, merged: false, error: prep.error ?? "Failed to create pull request" });
        continue;
      }
      const mergeRes = await mergePullRequest(WEBSITE_SLUG, prep.prNumber);
      all.push({
        branch,
        merged: mergeRes.ok,
        prUrl: prep.prUrl,
        error: mergeRes.ok ? undefined : (mergeRes.error ?? "Merge failed"),
      });
    }
    setResults(all);
    setSyncing(false);
    setStep("done");
  }

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        Sync Website
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next && !syncing) handleClose(); }}>
        <DialogContent className="flex max-h-[90vh] max-w-sm flex-col gap-0 p-0">

          {/* ── Select step ── */}
          {step === "select" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Sync Website Branches</DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  A pull request will be opened from <span>development</span> to each checked branch of{" "}
                  <span>{WEBSITE_SLUG}</span>.
                </p>
              </DialogHeader>

              <form onSubmit={handleSubmit(goToConfirm)} className="flex min-h-0 flex-1 flex-col">
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
                    <span className="text-sm font-medium">All branches</span>
                    <span className="ml-auto text-xs text-muted-foreground">{checked.size}/{BRANCHES.length}</span>
                  </label>

                  {/* Branch list */}
                  <div className="space-y-1">
                    {BRANCHES.map((branch) => (
                      <label key={branch} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                        <input
                          type="checkbox"
                          value={branch}
                          className="h-4 w-4 rounded accent-instrument"
                          {...register("branches")}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">{branch}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                  {errors.branches && <p className="mr-auto self-center text-xs text-status-error">{errors.branches.message}</p>}
                  <Button type="button" variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
                  <Button type="submit" size="sm">
                    Sync
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* ── Confirm step ── */}
          {step === "confirm" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Confirm Sync</DialogTitle>
              </DialogHeader>
              <div className="flex-1 px-5 py-5 text-sm text-muted-foreground space-y-4">
                <p>
                  Open a <span className="text-foreground">development →</span> pull request for{" "}
                  <strong className="text-foreground">{checked.size} {checked.size === 1 ? "branch" : "branches"}</strong> on {WEBSITE_SLUG}?
                </p>
                <ul className="space-y-1 text-xs">
                  {BRANCHES.filter((branch) => checked.has(branch)).map((branch) => (
                    <li key={branch} className="text-muted-foreground">· {branch}</li>
                  ))}
                </ul>
                <p className="text-xs">If an open pull request already exists, you will be shown its URL instead.</p>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" disabled={syncing} onClick={() => setStep("select")}>Back</Button>
                <Button size="sm" loading={syncing} onClick={handleSubmit(runSync)}>
                  {syncing ? "Syncing…" : "Confirm Sync"}
                </Button>
              </div>
            </>
          )}

          {/* ── Done step ── */}
          {step === "done" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Sync Results</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {results.map((r) => (
                  <div key={r.branch} className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-1.5">
                    <span className="text-xs text-foreground">{r.branch}</span>
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
                          View on Github
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-status-error">{r.error ?? "Failed"}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 justify-end border-t border-border px-5 py-4">
                <Button size="sm" onClick={handleClose}>Done</Button>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
