"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listBranchesAction, generateReleaseNotesAction, publishReleaseAction, syncMainAction } from "@/app/(app)/releases/actions";
import { KineticTextLoader } from "@/components/ui/kinetic-text-loader";
import { Textarea } from "@/components/ui/textarea";

type BumpType = "minor" | "patch";
type Step = "form" | "confirm" | "done";

const publishSchema = z.object({
  bump: z.enum(["minor", "patch"]),
  branch: z.string().min(1, "Branch is required"),
  syncMain: z.boolean(),
  notes: z.string(),
});

type PublishValues = z.infer<typeof publishSchema>;

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
  const [branchQuery, setBranchQuery] = React.useState("");
  const [branchPopoverOpen, setBranchPopoverOpen] = React.useState(false);
  const [branches, setBranches] = React.useState<string[]>([]);
  const [notesLoading, setNotesLoading] = React.useState(false);
  const lastGeneratedNotes = React.useRef("");
  const [publishResult, setPublishResult] = React.useState<{ tagName: string; htmlUrl: string } | null>(null);
  const [publishError, setPublishError] = React.useState<string | null>(null);
  const [publishing, setPublishing] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors },
  } = useForm<PublishValues>({
    resolver: zodResolver(publishSchema),
    defaultValues: { bump: "minor", branch: defaultBranch, syncMain: false, notes: "" },
  });

  const bump = watch("bump");
  const branch = watch("branch");
  const syncMain = watch("syncMain");
  const computedTag = bumpVersion(latestTag, bump);

  function handleOpen() {
    setStep("form");
    reset({ bump: "minor", branch: defaultBranch, syncMain: false, notes: "" });
    setBranchQuery("");
    lastGeneratedNotes.current = "";
    setPublishResult(null);
    setPublishError(null);
    setPublishing(false);
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
        lastGeneratedNotes.current = generated;
        setValue("notes", generated);
        setNotesLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, computedTag, branch]);

  function goToConfirm() {
    setStep("confirm");
  }

  async function publish() {
    setPublishError(null);
    setPublishing(true);

    const values = getValues();
    let finalNotes = values.notes;
    if (values.syncMain) {
      const syncRes = await syncMainAction(slug);
      if (!syncRes.ok) {
        setPublishing(false);
        setPublishError(syncRes.error ?? "Sync failed");
        return;
      }
      // The merge above can add commits to `branch` that weren't reflected when
      // notes were first generated — refresh them, unless the user edited by hand.
      if (values.notes === lastGeneratedNotes.current) {
        finalNotes = await generateReleaseNotesAction(slug, computedTag, values.branch, latestTag ?? undefined);
        setValue("notes", finalNotes);
      }
    }

    const res = await publishReleaseAction(slug, computedTag, values.branch, finalNotes);
    if (res.ok && res.result) {
      router.refresh();
      React.startTransition(() => {
        setPublishing(false);
        setPublishResult(res.result!);
        setStep("done");
      });
    } else {
      setPublishing(false);
      setPublishError(res.error ?? "Publish failed");
    }
  }

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        Publish Release
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next && !publishing) setOpen(false); }}>
        <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">

          {/* ── Form step ── */}
          {step === "form" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Publish Release</DialogTitle>
                {latestTag && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current latest: <span>{latestTag}</span>
                  </p>
                )}
              </DialogHeader>

              <form onSubmit={handleSubmit(goToConfirm)} className="relative min-h-0 flex-1 flex flex-col">
                {/* Overlay sits here — outside overflow-y-auto so inset-0 covers the visible box */}
                {notesLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                    <KineticTextLoader className="scale-[0.35]" />
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
                        type="button"
                        onClick={() => setValue("bump", b)}
                        className={[
                          "flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          bump === b
                            ? "border-instrument bg-instrument/10 text-instrument"
                            : "border-border bg-card/50 text-muted-foreground hover:border-instrument/40 hover:text-foreground",
                        ].join(" ")}
                      >
                        <div className="text-xs font-medium capitalize">{b}</div>
                        <div className="mt-0.5 text-sm font-semibold">
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
                      <button type="button" className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 text-sm outline-none transition-colors hover:border-instrument/40 focus:border-instrument/60">
                        <span className={cn("min-w-0 flex-1 truncate text-left", !branch && "text-muted-foreground")}>
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
                            type="button"
                            onClick={() => { setValue("branch", b, { shouldValidate: true }); setBranchQuery(""); setBranchPopoverOpen(false); }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                          >
                            <Check className={cn("h-3.5 w-3.5 shrink-0 text-instrument", branch !== b && "opacity-0")} />
                            <span className="min-w-0 flex-1 break-all">{b}</span>
                          </button>
                        ))}
                        {filteredBranches.length === 0 && branchQuery && (
                          <button
                            type="button"
                            onClick={() => { setValue("branch", branchQuery, { shouldValidate: true }); setBranchQuery(""); setBranchPopoverOpen(false); }}
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                          >
                            Use &ldquo;<span>{branchQuery}</span>&rdquo;
                          </button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {errors.branch && <p className="mt-1.5 text-xs text-status-error">{errors.branch.message}</p>}
                </div>

                {/* Sync Main */}
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card/50 px-3 py-3 transition-colors hover:border-instrument/40">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded accent-instrument"
                    {...register("syncMain")}
                  />
                  <div>
                    <p className="text-sm font-medium">Sync Main</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Create and merge a PR from <span>development → main</span> before releasing.
                    </p>
                  </div>
                </label>

                {/* Release notes */}
                <div>
                  <label className={fieldLabelCls}>Release notes</label>
                  <Textarea
                    rows={8}
                    className="bg-card/50 text-xs"
                    placeholder="Release notes will be auto-generated…"
                    {...register("notes")}
                  />
                </div>
              </div>{/* end scroll */}

              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={notesLoading}>
                  Release
                </Button>
              </div>
              </form>
            </>
          )}

          {/* ── Confirm step ── */}
          {step === "confirm" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Confirm Publish Release</DialogTitle>
              </DialogHeader>
              <div className="flex-1 px-5 py-5 space-y-4 text-sm text-muted-foreground">
                {syncMain && (
                  <p>
                    Merge <span className="text-foreground">development → main</span>, then publish{" "}
                    <span className="font-semibold text-foreground">{computedTag}</span>{" "}
                    from <span className="text-foreground">{branch}</span> as the latest release?
                  </p>
                )}
                {!syncMain && (
                  <p>
                    Publish{" "}
                    <span className="font-semibold text-foreground">{computedTag}</span>{" "}
                    from{" "}
                    <span className="text-foreground">{branch}</span>{" "}
                    as the latest release?
                  </p>
                )}
                {publishError && (
                  <p className="text-xs text-status-error">{publishError}</p>
                )}
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" className="" disabled={publishing} onClick={() => setStep("form")}>Back</Button>
                <Button size="sm" className="" loading={publishing} onClick={publish}>
                  {publishing ? "Releasing…" : "Confirm Release"}
                </Button>
              </div>
            </>
          )}

          {/* ── Done step ── */}
          {step === "done" && publishResult && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Publish Release Results</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-2">
                <div className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-1.5">
                  <span className="text-xs text-foreground">{publishResult.tagName}</span>
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
                <Button size="sm" className="" onClick={() => setOpen(false)}>Done</Button>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
