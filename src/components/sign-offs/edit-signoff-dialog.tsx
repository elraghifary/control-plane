"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarkdownView } from "@/components/pull-requests/markdown-view";
import { cn } from "@/lib/utils";
import type { ClickUpSignoffPage } from "@/lib/clickup/types";
import { fetchSignoffPageContentAction, saveSignoffPageContentAction } from "@/app/(app)/sign-offs/actions";

function EditSignoffDialogContent({ doc, onClose }: { doc: ClickUpSignoffPage; onClose: () => void }) {
  const [loading, setLoading] = React.useState(true);
  const [content, setContent] = React.useState("");
  const [preview, setPreview] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchSignoffPageContentAction(doc.id).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error ?? "Could not load document content");
        return;
      }
      setContent(res.content ?? "");
    });
    return () => { cancelled = true; };
  }, [doc.id]);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await saveSignoffPageContentAction(doc.id, content);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not save document");
      setError(res.error ?? "Could not save document");
      return;
    }
    toast.success("Sign-off document saved");
    onClose();
  }

  return (
    <DialogContent className="flex h-[min(90vh,860px)] max-w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1200px)]" showCloseButton>
      <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
        <DialogTitle className="text-base">{doc.name}</DialogTitle>
        {error && <p className="mt-1 text-xs text-status-error">{error}</p>}
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading document…</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Content</label>
              <div className="flex rounded-lg border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setPreview(false)}
                  className={cn("px-2.5 py-1 transition-colors", !preview ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(true)}
                  className={cn("border-l border-border px-2.5 py-1 transition-colors", preview ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  Preview
                </button>
              </div>
            </div>
            {preview ? (
              <div className="min-h-[60vh] rounded-lg border border-border bg-card/40 px-3 py-2 text-sm">
                {content.trim() ? <MarkdownView content={content} /> : <p className="text-muted-foreground">Nothing to preview.</p>}
              </div>
            ) : (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={28}
                className="bg-card/50 text-xs"
              />
            )}
          </>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
        <Button variant="outline" size="sm" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button size="sm" disabled={loading} loading={saving} onClick={save}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </DialogContent>
  );
}

export function EditSignoffDialog({ doc, onClose }: { doc: ClickUpSignoffPage | null; onClose: () => void }) {
  return (
    <Dialog open={!!doc} onOpenChange={(next) => { if (!next) onClose(); }}>
      {doc && <EditSignoffDialogContent key={doc.id} doc={doc} onClose={onClose} />}
    </Dialog>
  );
}
