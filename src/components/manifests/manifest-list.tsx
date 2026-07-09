"use client";

import * as React from "react";
import type { ClickUpManifestPage } from "@/lib/clickup/types";
import type { Repository } from "@/lib/data/types";
import { ManifestCard } from "./manifest-card";
import { EditManifestDialog } from "./edit-manifest-dialog";

export function ManifestList({ docs, repositories }: { docs: ClickUpManifestPage[]; repositories: Repository[] }) {
  const [editingDoc, setEditingDoc] = React.useState<ClickUpManifestPage | null>(null);

  return (
    <div className="space-y-4">
      {docs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No manifest documents yet.
        </p>
      ) : (
        <div className="space-y-4">
          {docs.map((doc) => (
            <ManifestCard key={doc.id} doc={doc} onEdit={() => setEditingDoc(doc)} />
          ))}
        </div>
      )}

      <EditManifestDialog doc={editingDoc} repositories={repositories} onClose={() => setEditingDoc(null)} />
    </div>
  );
}
