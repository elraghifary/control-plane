"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecretRow } from "./secret-row";
import { SecretFormDialog } from "./secret-form-dialog";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import { BumpVersionButton } from "./bump-version-button";
import { PageSizeSelector } from "./page-size-selector";
import { useWriteGuard } from "./write-guard";
import { EmptyState } from "@/components/states/empty-state";
import type { Environment } from "@/lib/apps/env-config";
import type { SecretDTO } from "@/lib/apps/types";

const PAGE_SIZE_OPTIONS = [10, 20, 30];

export function SecretList({
  environment,
  initialSecrets,
}: {
  environment: Environment;
  initialSecrets: SecretDTO[];
}) {
  const { writesAllowed } = useWriteGuard();
  const [search, setSearch] = React.useState("");
  const [pageSize, setPageSize] = React.useState(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = React.useState(1);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingSecret, setEditingSecret] = React.useState<SecretDTO | null>(null);
  const [deletingSecret, setDeletingSecret] = React.useState<SecretDTO | null>(null);

  const filtered = initialSecrets.filter((s) => s.key.toLowerCase().includes(search.trim().toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageSecrets = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function openCreate() {
    setEditingSecret(null);
    setFormOpen(true);
  }

  function openEdit(secret: SecretDTO) {
    setEditingSecret(secret);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search key…"
              className="w-48 rounded-full border border-border bg-card/40 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-instrument/40"
            />
          </div>
          <PageSizeSelector
            options={PAGE_SIZE_OPTIONS}
            selected={pageSize}
            onChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" disabled={!writesAllowed} onClick={openCreate}>Add Secret</Button>
          <BumpVersionButton environment={environment} disabled={!writesAllowed} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={initialSecrets.length === 0 ? "No secrets yet" : "No matches"}
          description={initialSecrets.length === 0 ? "Add the first secret for this environment." : "Try a different search."}
        />
      ) : (
        <div className="space-y-2">
          {pageSecrets.map((secret) => (
            <SecretRow
              key={secret.id}
              environment={environment}
              secret={secret}
              onEdit={openEdit}
              onDelete={setDeletingSecret}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</Button>
          <span className="text-xs text-muted-foreground">Page {safePage} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next</Button>
        </div>
      )}

      <SecretFormDialog environment={environment} secret={editingSecret} open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDeleteDialog
        environment={environment}
        secret={deletingSecret}
        open={!!deletingSecret}
        onOpenChange={(next) => { if (!next) setDeletingSecret(null); }}
      />
    </div>
  );
}
