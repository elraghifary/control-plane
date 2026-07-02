"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronRight, Plus, MessageSquarePlus, Pencil, Copy as CopyIcon, Link2 } from "lucide-react";
import type { PullRequestFileChange, ReviewCommentSide } from "@/lib/data/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fileChangeStatusBadgeVariant } from "./pr-utils";
import { fetchPullRequestFiles, submitLineComment } from "@/app/(app)/pull-requests/actions";
import { KineticTextLoader } from "@/components/ui/kinetic-text-loader";

interface DiffRow {
  type: "hunk" | "context" | "add" | "remove" | "meta";
  content: string;
  oldLine?: number;
  newLine?: number;
}

const HUNK_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

function parseDiffRows(patch: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldLine = 0;
  let newLine = 0;
  for (const line of patch.trimEnd().split("\n")) {
    const hunk = HUNK_RE.exec(line);
    if (hunk) {
      oldLine = parseInt(hunk[1], 10);
      newLine = parseInt(hunk[2], 10);
      rows.push({ type: "hunk", content: line });
      continue;
    }
    if (line.startsWith("\\")) {
      rows.push({ type: "meta", content: line });
      continue;
    }
    if (line.startsWith("+") && !line.startsWith("+++")) {
      rows.push({ type: "add", content: line, newLine: newLine++ });
      continue;
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      rows.push({ type: "remove", content: line, oldLine: oldLine++ });
      continue;
    }
    rows.push({ type: "context", content: line, oldLine: oldLine++, newLine: newLine++ });
  }
  return rows;
}

interface LineCommentTarget {
  slug: string;
  number: number;
  path: string;
  commitId: string;
}

function lineCode(content: string) {
  return content.slice(1);
}

function DiffPatch({ patch, commentable }: { patch?: string; commentable?: LineCommentTarget }) {
  const [active, setActive] = React.useState<{ index: number; line: number; side: ReviewCommentSide } | null>(null);
  const [commentText, setCommentText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [menuOpenIndex, setMenuOpenIndex] = React.useState<number | null>(null);

  const rows = React.useMemo(() => (patch ? parseDiffRows(patch) : []), [patch]);

  if (!patch) {
    return <p className="px-4 py-4 text-xs text-muted-foreground">Binary or too large to display.</p>;
  }

  function openComment(index: number, side: ReviewCommentSide, line?: number) {
    if (!commentable || !line) return;
    setMenuOpenIndex(null);
    setActive({ index, side, line });
    setCommentText("");
  }

  function openSuggestion(index: number, side: ReviewCommentSide, line: number | undefined, content: string) {
    if (!commentable || !line) return;
    setMenuOpenIndex(null);
    setActive({ index, side, line });
    setCommentText(`\`\`\`suggestion\n${lineCode(content)}\n\`\`\`\n`);
  }

  function copyLine(content: string) {
    navigator.clipboard.writeText(lineCode(content));
    toast.success("Line copied");
    setMenuOpenIndex(null);
  }

  function copyLink(line?: number) {
    if (!commentable || !line) return;
    const [owner, repo] = commentable.slug.split("/");
    const url = `https://github.com/${owner}/${repo}/blob/${commentable.commitId}/${commentable.path}#L${line}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied");
    setMenuOpenIndex(null);
  }

  async function submit() {
    if (!commentable || !active || !commentText.trim()) return;
    setSubmitting(true);
    const res = await submitLineComment(
      commentable.slug, commentable.number, commentable.commitId, commentable.path, active.line, active.side, commentText,
    );
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not add comment");
      return;
    }
    toast.success("Comment added");
    setActive(null);
    setCommentText("");
  }

  return (
    <div className="font-mono text-[11px] leading-relaxed">
      {rows.map((row, i) => {
        if (row.type === "hunk" || row.type === "meta") {
          return (
            <div key={i} className={cn("flex", row.type === "hunk" && "bg-muted/60 text-instrument", row.type === "meta" && "text-muted-foreground")}>
              <span className="w-16 shrink-0" />
              <span className="flex-1 break-words px-2 py-0.5">{row.content}</span>
            </div>
          );
        }

        const oldClickable = !!commentable && row.type === "remove";
        const newClickable = !!commentable && (row.type === "add" || row.type === "context");
        const isActive = active?.index === i;

        function gutter(line: number | undefined, side: ReviewCommentSide, clickable: boolean) {
          if (!clickable || !line) {
            return (
              <span className="flex w-8 shrink-0 select-none items-center justify-end px-1 text-right text-muted-foreground/50 group-hover:text-muted-foreground">
                {line ?? ""}
              </span>
            );
          }
          const menuOpen = menuOpenIndex === i;
          return (
            <span className="flex w-8 shrink-0 select-none">
              <Popover open={menuOpen} onOpenChange={(v) => setMenuOpenIndex(v ? i : null)}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative flex h-full w-full items-center justify-center text-muted-foreground/50 hover:text-instrument-2"
                    title="Line actions"
                  >
                    <span className={cn("pointer-events-none", !menuOpen && "group-hover:opacity-0", menuOpen && "opacity-0")}>
                      {line}
                    </span>
                    <Plus
                      className={cn(
                        "pointer-events-none absolute inset-0 m-auto h-4 w-4 text-instrument opacity-0 transition-opacity",
                        !menuOpen && "group-hover:opacity-100",
                        menuOpen && "opacity-100",
                      )}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-44 gap-0.5 p-1">
                  <button
                    type="button"
                    onClick={() => openComment(i, side, line)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5 text-muted-foreground" /> Add comment
                  </button>
                  <button
                    type="button"
                    onClick={() => openSuggestion(i, side, line, row.content)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" /> Add suggestion
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={() => copyLine(row.content)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <CopyIcon className="h-3.5 w-3.5 text-muted-foreground" /> Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => copyLink(line)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    <Link2 className="h-3.5 w-3.5 text-muted-foreground" /> Copy link
                  </button>
                </PopoverContent>
              </Popover>
            </span>
          );
        }

        return (
          <React.Fragment key={i}>
            <div
              className={cn(
                "group flex",
                row.type === "add" && "bg-status-healthy/10 text-status-healthy",
                row.type === "remove" && "bg-status-error/10 text-status-error",
              )}
            >
              {gutter(row.oldLine, "LEFT", oldClickable)}
              {gutter(row.newLine, "RIGHT", newClickable)}
              <span className="flex-1 break-words px-2 py-0.5">{row.content || " "}</span>
            </div>
            {isActive && (
              <div className="border-y border-instrument/30 bg-card/60 px-4 py-3">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Leave a comment on this line…"
                  rows={commentText.includes("```suggestion") ? 5 : 3}
                  className="bg-card/40 text-xs"
                  autoFocus
                />
                <div className="mt-2 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setActive(null)}>Cancel</Button>
                  <Button size="sm" disabled={submitting || !commentText.trim()} onClick={submit}>
                    {submitting ? "Submitting…" : "Comment"}
                  </Button>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
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
  commitId,
}: {
  slug: string;
  number: number;
  linkedPrs?: Array<{ slug: string; number: number }>;
  commitId?: string;
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
      <KineticTextLoader className="scale-[0.4]" />
    </div>
  );
  if (error) return <p className="p-4 text-xs text-status-error">{error}</p>;
  if (groups.length === 0) return <p className="p-4 text-xs text-muted-foreground">No file changes.</p>;

  const multi = groups.length > 1;

  return (
    <div className="grid h-full grid-cols-1 sm:grid-cols-[3fr_7fr]">
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
              // Line comments only supported on the PR being reviewed (group 0), which needs its commit sha.
              const commentable = gIdx === 0 && commitId
                ? { slug, number, path: file.filename, commitId }
                : undefined;
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
                      <DiffPatch patch={file.patch} commentable={commentable} />
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
