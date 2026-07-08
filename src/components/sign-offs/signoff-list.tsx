"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClickUpSignoffDoc } from "@/lib/clickup/types";
import { Button } from "@/components/ui/button";
import { useNavigationLoading } from "@/components/navigation-loading";
import { SignoffCard } from "./signoff-card";
import { EditSignoffDialog } from "./edit-signoff-dialog";

export function SignoffList({
  docs,
  nextCursor,
  cursorHistory,
  currentCursor,
}: {
  docs: ClickUpSignoffDoc[];
  nextCursor: string | null;
  cursorHistory: string[];
  currentCursor?: string;
}) {
  const { navigate } = useNavigationLoading();
  const [editingDoc, setEditingDoc] = React.useState<ClickUpSignoffDoc | null>(null);

  function buildUrl(cursor: string | undefined, history: string[]): string {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (history.length) params.set("history", history.join(","));
    const qs = params.toString();
    return `/sign-offs${qs ? `?${qs}` : ""}`;
  }

  function goNext() {
    if (!nextCursor) return;
    const newHistory = currentCursor ? [...cursorHistory, currentCursor] : cursorHistory;
    navigate(buildUrl(nextCursor, newHistory));
  }

  function goPrev() {
    const prevHistory = [...cursorHistory];
    const prevCursor = prevHistory.pop();
    navigate(buildUrl(prevCursor, prevHistory));
  }

  const isFirstPage = cursorHistory.length === 0 && !currentCursor;
  const showPagination = !isFirstPage || !!nextCursor;

  return (
    <div className="space-y-4">
      {docs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No sign-off documents yet.
        </p>
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => (
            <SignoffCard key={doc.id} doc={doc} onEdit={() => setEditingDoc(doc)} />
          ))}
        </div>
      )}

      {showPagination && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full" disabled={isFirstPage} onClick={goPrev}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-full" disabled={!nextCursor} onClick={goNext}>
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <EditSignoffDialog doc={editingDoc} onClose={() => setEditingDoc(null)} />
    </div>
  );
}
