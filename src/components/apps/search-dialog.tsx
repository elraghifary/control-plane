"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CellStatusBadge } from "./cell-status-badge";
import { searchSecretKeysAction } from "@/app/(app)/apps/actions";
import type { SearchRow } from "@/lib/apps/types";

const ENV_COLUMNS = [
  { id: "development" as const, label: "Development" },
  { id: "preview" as const, label: "Preview" },
  { id: "production" as const, label: "Production" },
];

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [rows, setRows] = React.useState<SearchRow[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searched, setSearched] = React.useState(false);

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    const res = await searchSecretKeysAction(query);
    setSearching(false);
    setSearched(true);
    if (!res.ok) {
      toast.error(res.error ?? "Could not search secrets");
      return;
    }
    setRows(res.rows);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setRows([]);
      setSearched(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Search</Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-[min(90vh,860px)] max-w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1200px)]">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Search Secret Keys</DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Searches secret keys across all 3 environments at once. Values are never shown.
            </p>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="flex items-center gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
                placeholder="Search key…"
                autoFocus
              />
              <Button size="sm" onClick={runSearch} loading={searching} disabled={!query.trim()}>
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>

            {searched && (
              rows.length === 0 ? (
                <p className="mt-6 text-center text-sm text-muted-foreground">No matching keys.</p>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 text-left font-medium">Key</th>
                        {ENV_COLUMNS.map((col) => (
                          <th key={col.id} className="px-3 py-2 text-left font-medium">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.key} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-mono text-xs">{row.key}</td>
                          {ENV_COLUMNS.map((col) => (
                            <td key={col.id} className="px-3 py-2">
                              <CellStatusBadge status={row.cells[col.id]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
