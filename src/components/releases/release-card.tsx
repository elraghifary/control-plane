"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tag, User, Calendar, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Release } from "@/lib/data/types";

function formatReleaseDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ReleaseBody({ body }: { body: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <p className="text-xs font-semibold text-foreground mb-1">{children}</p>,
        h2: ({ children }) => <p className="text-xs font-semibold text-foreground mb-1">{children}</p>,
        h3: ({ children }) => <p className="text-xs font-medium text-foreground mb-0.5">{children}</p>,
        p: ({ children }) => <p className="text-xs text-muted-foreground">{children}</p>,
        ul: ({ children }) => <ul className="space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="space-y-0.5 list-decimal list-inside">{children}</ol>,
        li: ({ children }) => (
          <li className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <span className="mt-0.5 shrink-0 text-instrument">·</span>
            <span>{children}</span>
          </li>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-instrument underline-offset-2 hover:underline">
            {children}
          </a>
        ),
        strong: ({ children }) => <strong className="font-medium text-foreground">{children}</strong>,
        code: ({ children }) => <code className="font-mono text-[11px] bg-muted/50 px-1 py-0.5 rounded">{children}</code>,
        hr: () => <hr className="border-border my-2" />,
      }}
    >
      {body}
    </ReactMarkdown>
  );
}

export function ReleaseCard({ release }: { release: Release }) {
  const hasBody = release.body.trim().length > 0;

  return (
    <article className="rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur transition-colors hover:border-instrument/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Tag + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 shrink-0 text-instrument" />
            <a
              href={release.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm font-semibold hover:text-instrument hover:underline"
            >
              {release.tagName}
            </a>
            <Badge variant={release.isLatest ? "healthy" : "secondary"}>
              {release.isLatest ? "Latest" : "Released"}
            </Badge>
            {release.isPrerelease && <Badge variant="warn">Pre-release</Badge>}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />{release.author}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {release.publishedAt ? formatReleaseDate(release.publishedAt) : "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-3.5 w-3.5" />
              <code className="font-mono">{release.targetBranch}</code>
            </span>
          </div>

          {/* What's Changed */}
          {hasBody && (
            <div className="space-y-1.5">
              <ReleaseBody body={release.body} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 self-start">
          <a href={release.htmlUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="">
              GitHub
            </Button>
          </a>
        </div>
      </div>
    </article>
  );
}
