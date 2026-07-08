"use client";

import { FileText, Calendar, Clock } from "lucide-react";
import type { ClickUpSignoffPage } from "@/lib/clickup/types";
import { Button } from "@/components/ui/button";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function SignoffCard({ doc, onEdit }: { doc: ClickUpSignoffPage; onEdit: () => void }) {
  return (
    <article className="rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur transition-colors hover:border-instrument/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-instrument" />
            <a
              href={doc.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium hover:text-instrument hover:underline"
            >
              {doc.name}
            </a>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Created {formatDate(doc.createdAt)}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Updated {formatDate(doc.updatedAt)}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-stretch">
          <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
          <a href={doc.htmlUrl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline">ClickUp</Button>
          </a>
        </div>
      </div>
    </article>
  );
}
