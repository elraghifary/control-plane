"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import type { Repository } from "@/lib/data/types";
import type { StagingCreateResult } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { groupRepositories } from "@/components/shell/repository-selector";
import { prepareStagingPR, mergePullRequest } from "@/app/(app)/pull-requests/actions";

type Step = "select" | "confirm" | "done";

const syncSchema = z.object({
  slugs: z.array(z.string()).min(1, "Select at least one repository"),
});

type SyncValues = z.infer<typeof syncSchema>;

export function SyncStagingDialog({
  repositories,
  selectedSlug,
}: {
  repositories: Repository[];
  selectedSlug: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("select");
  const [results, setResults] = React.useState<StagingCreateResult[]>([]);
  const [syncing, setSyncing] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SyncValues>({
    resolver: zodResolver(syncSchema),
    defaultValues: { slugs: [] },
  });

  const slugs = watch("slugs");
  const checked = new Set(slugs);

  function handleOpen() {
    setStep("select");
    reset({ slugs: [] });
    setResults([]);
    setSyncing(false);
    setSearch("");
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  const allChecked = repositories.length > 0 && repositories.every((r) => checked.has(r.slug));
  const someChecked = repositories.some((r) => checked.has(r.slug));

  const filteredRepositories = repositories.filter((r) => r.slug.toLowerCase().includes(search.trim().toLowerCase()));
  const groups = groupRepositories(filteredRepositories);

  function toggleAll(value: boolean) {
    setValue("slugs", value ? repositories.map((r) => r.slug) : [], { shouldValidate: true });
  }

  function goToConfirm() {
    setStep("confirm");
  }

  async function runSync(values: SyncValues) {
    setSyncing(true);
    setResults([]);
    const all: StagingCreateResult[] = [];
    for (const slug of values.slugs) {
      const prep = await prepareStagingPR(slug);
      if (prep.alreadySynced) {
        all.push({ slug, created: false, merged: false, alreadySynced: true });
        continue;
      }
      if (prep.error || !prep.prNumber) {
        all.push({ slug, created: false, merged: false, error: prep.error ?? "Failed to create pull request" });
        continue;
      }
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
    setSyncing(false);
    setStep("done");
  }

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        Sync Staging
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next && !syncing) handleClose(); }}>
        <DialogContent className="flex max-h-[90vh] max-w-sm flex-col gap-0 p-0">

          {/* ── Select step ── */}
          {step === "select" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Sync Development → Staging</DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  A pull request will be opened from <span>development</span> → <span>staging</span> for each selected repository.
                </p>
              </DialogHeader>

              <form onSubmit={handleSubmit(goToConfirm)} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">
                {/* Search — sticky at top of the scroll area */}
                <div className="sticky top-0 z-10 border-b border-border bg-popover px-5 py-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search repository…"
                      className="w-full rounded-lg border border-border bg-card/40 py-1.5 pl-8 pr-2 outline-none focus:border-instrument/40"
                    />
                  </div>
                </div>

                <div className="px-5 py-4">
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

                  {/* Repository list, grouped */}
                  {groups.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-muted-foreground">No repositories found.</p>
                  ) : (
                    groups.map((group) => (
                      <div key={group.label} className="mb-2 last:mb-0">
                        <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
                        <div className="space-y-1">
                          {group.repos.map((r) => (
                            <label key={r.slug} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                              <input
                                type="checkbox"
                                value={r.slug}
                                className="h-4 w-4 rounded accent-instrument"
                                {...register("slugs")}
                              />
                              <span className="min-w-0 flex-1 truncate text-xs">{r.slug}</span>
                              {r.slug === selectedSlug && (
                                <span className="shrink-0 text-[10px] text-instrument">current</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                {errors.slugs && <p className="mr-auto self-center text-xs text-status-error">{errors.slugs.message}</p>}
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
                  Open a <span className="text-foreground">development → staging</span> pull request for{" "}
                  <strong className="text-foreground">{checked.size} {checked.size === 1 ? "repository" : "repositories"}</strong>?
                </p>
                <ul className="space-y-1 text-xs">
                  {[...checked].map((slug) => (
                    <li key={slug} className="text-muted-foreground">· {slug}</li>
                  ))}
                </ul>
                <p className="text-xs">If an open pull request already exists, you will be shown its URL instead.</p>
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" className="" disabled={syncing} onClick={() => setStep("select")}>Back</Button>
                <Button size="sm" className="" loading={syncing} onClick={handleSubmit(runSync)}>
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
                  <div key={r.slug} className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-1.5">
                    <span className="text-xs text-foreground">{r.slug}</span>
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
                <Button size="sm" className="" onClick={handleClose}>Done</Button>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
