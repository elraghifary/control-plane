"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { releaseProductionAction, resolveJenkinsBuildUrlAction } from "@/app/(app)/releases/actions";

type Step = "select" | "confirm" | "done";

const fieldLabelCls = "mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

const BUILD_POLL_INTERVAL_MS = 2000;
const BUILD_POLL_MAX_ATTEMPTS = 15;

/** Jenkins first returns a queue-item URL; poll it until the item resolves to a real build. */
function JenkinsBuildLink({ queueUrl }: { queueUrl: string }) {
  const [buildUrl, setBuildUrl] = React.useState<string | null>(null);
  const [resolving, setResolving] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function poll(attempt: number) {
      const res = await resolveJenkinsBuildUrlAction(queueUrl);
      if (cancelled) return;
      if (res.ok && res.buildUrl) {
        setBuildUrl(res.buildUrl);
        setResolving(false);
        return;
      }
      if (attempt >= BUILD_POLL_MAX_ATTEMPTS) {
        setResolving(false);
        return;
      }
      setTimeout(() => poll(attempt + 1), BUILD_POLL_INTERVAL_MS);
    }
    poll(1);

    return () => { cancelled = true; };
  }, [queueUrl]);

  if (resolving) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Waiting for Jenkins to start the build…
      </span>
    );
  }

  return (
    <>
      <span>Build started</span>
      <a
        href={buildUrl ?? queueUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 underline hover:text-foreground"
      >
        View in Jenkins
      </a>
    </>
  );
}

export function ReleaseProductionDialog({ repoName, tags }: { repoName: string; tags: string[] }) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("select");
  const [tag, setTag] = React.useState("");
  const [tagQuery, setTagQuery] = React.useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = React.useState(false);
  const [triggering, setTriggering] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [queueUrl, setQueueUrl] = React.useState<string | null>(null);

  function handleOpen() {
    setStep("select");
    setTag(tags[0] ?? "");
    setTagQuery("");
    setError(null);
    setQueueUrl(null);
    setTriggering(false);
    setOpen(true);
  }

  const filteredTags = tags.filter((t) => t.toLowerCase().includes(tagQuery.toLowerCase()));

  async function trigger() {
    setError(null);
    setTriggering(true);
    const res = await releaseProductionAction(repoName, tag);
    setTriggering(false);
    if (res.ok) {
      setQueueUrl(res.queueUrl ?? null);
      setStep("done");
    } else {
      setError(res.error ?? "Could not trigger production release");
    }
  }

  return (
    <>
      <Button size="sm" onClick={handleOpen}>
        Release Production
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next && !triggering) setOpen(false); }}>
        <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 p-0">

          {/* ── Select step ── */}
          {step === "select" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Release Production</DialogTitle>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <label className={fieldLabelCls}>Tag</label>
                <Popover modal open={tagPopoverOpen} onOpenChange={(v) => { setTagPopoverOpen(v); if (!v) setTagQuery(""); }}>
                  <PopoverTrigger asChild>
                    <button className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 text-sm outline-none transition-colors hover:border-instrument/40 focus:border-instrument/60">
                      <span className={cn("min-w-0 flex-1 truncate text-left", !tag && "text-muted-foreground")}>
                        {tag || "Select tag…"}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                    <div className="border-b border-border px-3 py-2">
                      <input
                        autoFocus
                        value={tagQuery}
                        onChange={(e) => setTagQuery(e.target.value)}
                        placeholder="Search…"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {filteredTags.length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">No tags found.</p>
                      )}
                      {filteredTags.map((t) => (
                        <button
                          key={t}
                          onClick={() => { setTag(t); setTagQuery(""); setTagPopoverOpen(false); }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
                        >
                          <Check className={cn("h-3.5 w-3.5 shrink-0 text-instrument", tag !== t && "opacity-0")} />
                          <span className="min-w-0 flex-1 break-all">{t}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <Button size="sm" disabled={!tag} onClick={() => setStep("confirm")}>Release</Button>
              </div>
            </>
          )}

          {/* ── Confirm step ── */}
          {step === "confirm" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Confirm Production Release</DialogTitle>
              </DialogHeader>
              <div className="flex-1 px-5 py-5 space-y-4 text-sm text-muted-foreground">
                <p>
                  Trigger Jenkins job{" "}
                  <span className="font-semibold text-foreground">{repoName}-release</span>{" "}
                  for tag <span className="font-semibold text-foreground">{tag}</span>?
                </p>
                {error && <p className="text-xs text-status-error">{error}</p>}
              </div>
              <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
                <Button variant="outline" size="sm" disabled={triggering} onClick={() => setStep("select")}>Back</Button>
                <Button size="sm" loading={triggering} onClick={trigger}>
                  {triggering ? "Releasing…" : "Confirm Release"}
                </Button>
              </div>
            </>
          )}

          {/* ── Done step ── */}
          {step === "done" && (
            <>
              <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                <DialogTitle className="text-base">Production Release Results</DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-2">
                <div className="rounded-xl border border-border/70 bg-card/50 p-3 space-y-1.5">
                  <span className="text-xs text-foreground">{tag}</span>
                  <div className="flex items-center gap-1.5 text-xs text-status-healthy">
                    {queueUrl && <JenkinsBuildLink key={queueUrl} queueUrl={queueUrl} />}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 justify-end border-t border-border px-5 py-4">
                <Button size="sm" onClick={() => setOpen(false)}>Done</Button>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}
