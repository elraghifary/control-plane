"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import type { PullRequestFileChange } from "@/lib/data/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fileChangeStatusBadgeVariant } from "./pr-utils";
import { fetchPullRequestFiles } from "@/app/(app)/pull-requests/actions";
import { KineticTextLoader } from "@/components/ui/kinetic-text-loader";

function DiffPatch({ patch }: { patch?: string }) {
  if (!patch) {
    return <p className="px-4 py-4 text-xs text-muted-foreground">Binary or too large to display.</p>;
  }
  return (
    <pre className="break-words whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
      {patch.split("\n").map((line, i) => (
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

type FileGroup = { label: string; files: PullRequestFileChange[] };

function fileKey(gIdx: number, fIdx: number) {
  return `${gIdx}-${fIdx}`;
}

export function PrFilesViewer({
  slug,
  number,
  linkedPrs = [],
}: {
  slug: string;
  number: number;
  linkedPrs?: Array<{ slug: string; number: number }>;
}) {
  const [groups, setGroups] = React.useState<FileGroup[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const fileRefs = React.useRef<Map<string, HTMLDivElement | null>>(new Map());

  const linkedPrsKey = linkedPrs.map((p) => `${p.slug}#${p.number}`).join(",");

  React.useEffect(() => {
    let cancelled = false;
    React.startTransition(() => { setLoading(true); setError(null); });

    const toFetch = [
      { label: slug.split("/")[1] ?? slug, slug, number },
      ...linkedPrs.map((p) => ({ label: p.slug.split("/")[1] ?? p.slug, ...p })),
    ];

    Promise.all(
      toFetch.map(async (p) => {
        const files = await fetchPullRequestFiles(p.slug, p.number).catch(() => []);
        return { label: p.label, files };
      }),
    )
      .then((results) => {
        if (cancelled) return;
        setGroups(results.filter((g) => g.files.length > 0));
        setCollapsed(new Set());
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load file changes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, number, linkedPrsKey]);

  function toggle(gIdx: number, fIdx: number) {
    const key = fileKey(gIdx, fIdx);
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function scrollToFile(gIdx: number, fIdx: number) {
    const key = fileKey(gIdx, fIdx);
    setCollapsed((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    requestAnimationFrame(() => {
      fileRefs.current.get(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <KineticTextLoader className="scale-[0.4] overflow-hidden" />
    </div>
  );
  if (error) return <p className="p-4 text-xs text-status-error">{error}</p>;
  if (groups.length === 0) return <p className="p-4 text-xs text-muted-foreground">No file changes.</p>;

  const multi = groups.length > 1;

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden sm:grid-cols-[3fr_7fr]">
      {/* ── Left: file list (desktop only) ── */}
      <div className="hidden overflow-y-auto border-r border-border sm:block">
        {groups.map((group, gIdx) => (
          <div key={gIdx}>
            {multi && (
              <div className="sticky top-0 z-10 border-b border-t border-border bg-muted/60 px-3 py-1.5 backdrop-blur-sm first:border-t-0">
                <span className="font-mono text-[11px] font-medium text-instrument">{group.label}</span>
              </div>
            )}
            {group.files.map((file, fIdx) => (
              <button
                key={fIdx}
                type="button"
                onClick={() => scrollToFile(gIdx, fIdx)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/40"
              >
                <ChevronRight
                  className={cn(
                    "mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60 transition-transform duration-150",
                    !collapsed.has(fileKey(gIdx, fIdx)) && "rotate-90",
                  )}
                />
                <span className="min-w-0 flex-1 break-all font-mono text-[11px] leading-snug">{file.filename}</span>
                <span className="flex shrink-0 items-center gap-1 pt-0.5">
                  <Badge variant="healthy" size="sm">+{file.additions}</Badge>
                  <Badge variant="error" size="sm">-{file.deletions}</Badge>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* ── Right: diff content ── */}
      <div className="min-h-0 overflow-y-auto">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className={cn(multi && gIdx > 0 && "border-t-2 border-border")}>
            {multi && (
              <div className="sticky top-0 z-20 flex h-8 items-center gap-2 border-b border-border bg-muted/80 px-4 backdrop-blur-sm">
                <span className="font-mono text-xs font-medium text-instrument">{group.label}</span>
                <span className="text-xs text-muted-foreground">
                  {group.files.length} {group.files.length === 1 ? "file" : "files"}
                </span>
              </div>
            )}
            {group.files.map((file, fIdx) => {
              const key = fileKey(gIdx, fIdx);
              return (
                <div
                  key={fIdx}
                  ref={(el) => { fileRefs.current.set(key, el); }}
                  className="border-b border-border/50 last:border-0"
                >
                  <div className={cn("sticky z-10", multi ? "top-8" : "top-0")}>
                  <button
                    type="button"
                    onClick={() => toggle(gIdx, fIdx)}
                    className="flex w-full items-center justify-between gap-2 border-b border-border/40 bg-card/95 px-4 py-2 backdrop-blur-sm hover:bg-muted/30"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                          !collapsed.has(key) && "rotate-90",
                        )}
                      />
                      <span className="min-w-0 break-all text-left font-mono text-[11px]">{file.filename}</span>
                    </span>
                    <span className="ml-2 flex shrink-0 items-center gap-1">
                      {file.status !== "modified" && (
                        <Badge variant={fileChangeStatusBadgeVariant(file.status)} size="sm">{file.status}</Badge>
                      )}
                      <Badge variant="healthy" size="sm">+{file.additions}</Badge>
                      <Badge variant="error" size="sm">-{file.deletions}</Badge>
                    </span>
                  </button>
                  </div>
                  {!collapsed.has(key) && (
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
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
