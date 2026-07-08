"use client";

import * as React from "react";
import type { ClickUpSignoffPage } from "@/lib/clickup/types";
import { SignoffCard } from "./signoff-card";
import { EditSignoffDialog } from "./edit-signoff-dialog";

export function SignoffList({ docs }: { docs: ClickUpSignoffPage[] }) {
  const [editingDoc, setEditingDoc] = React.useState<ClickUpSignoffPage | null>(null);

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

      <EditSignoffDialog doc={editingDoc} onClose={() => setEditingDoc(null)} />
    </div>
  );
}
