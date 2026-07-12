"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CellStatusBadge } from "./cell-status-badge";
import { getComparisonAction } from "@/app/(app)/apps/actions";
import type { Comparison } from "@/lib/apps/types";

const ENV_COLUMNS = [
  { id: "development" as const, label: "Development" },
  { id: "preview" as const, label: "Preview" },
  { id: "production" as const, label: "Production" },
];

const tableHeadCls = "border-b border-border bg-muted/40 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const tableCellCls = "px-3 py-2 align-top";

function SectionTable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function CompareDialog() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [comparison, setComparison] = React.useState<Comparison | null>(null);

  async function load() {
    setLoading(true);
    const res = await getComparisonAction();
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not compare environments");
      return;
    }
    setComparison(res.comparison);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !comparison) load();
  }

  const secretIssues = comparison?.secrets.filter((r) => r.hasIssue).length ?? 0;
  const flagDiffs = comparison?.flags.filter((r) => r.diff).length ?? 0;
  const updateDiffs = comparison?.updates.filter((r) => r.diff).length ?? 0;
  const iapDiffs = comparison?.iap.filter((r) => r.diff).length ?? 0;

  return (
    <>
      <Button size="sm" onClick={() => handleOpenChange(true)}>Compare</Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-[min(90vh,860px)] max-w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1200px)]">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Compare Environments</DialogTitle>
            {comparison && (
              <p className="mt-1 text-xs text-muted-foreground">
                {secretIssues} secret {secretIssues === 1 ? "issue" : "issues"} · {flagDiffs} flag {flagDiffs === 1 ? "diff" : "diffs"} · {updateDiffs} update {updateDiffs === 1 ? "diff" : "diffs"} · {iapDiffs} in-app purchases {iapDiffs === 1 ? "diff" : "diffs"}
              </p>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-6">
            {loading || !comparison ? (
              <p className="text-sm text-muted-foreground">{loading ? "Comparing…" : "—"}</p>
            ) : (
              <>
                <SectionTable title="Secrets">
                  <thead>
                    <tr>
                      <th className={tableHeadCls}>Key</th>
                      {ENV_COLUMNS.map((col) => <th key={col.id} className={tableHeadCls}>{col.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.secrets.map((row) => (
                      <tr key={row.key} className={cn("border-b border-border last:border-0", row.hasIssue && "bg-status-error/7")}>
                        <td className={cn(tableCellCls, "font-mono text-xs")}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {row.key}
                            {row.critical && <Badge variant="error" size="sm">critical</Badge>}
                            {row.required && !row.critical && <Badge variant="secondary" size="sm">required</Badge>}
                            {row.extra && <Badge variant="outline" size="sm">extra</Badge>}
                          </div>
                        </td>
                        {ENV_COLUMNS.map((col) => (
                          <td key={col.id} className={tableCellCls}><CellStatusBadge status={row.cells[col.id]} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </SectionTable>

                <SectionTable title="Feature Flags">
                  <thead>
                    <tr>
                      <th className={tableHeadCls}>Flag</th>
                      {ENV_COLUMNS.map((col) => <th key={col.id} className={tableHeadCls}>{col.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.flags.map((row) => (
                      <tr key={row.id} className={cn("border-b border-border last:border-0", row.diff && "bg-status-warn/7")}>
                        <td className={cn(tableCellCls, "font-mono text-xs")}>{row.id}</td>
                        {ENV_COLUMNS.map((col) => {
                          const cell = row.cells[col.id];
                          return (
                            <td key={col.id} className={tableCellCls}>
                              {cell.status === "present" && cell.summary ? (
                                <span className="font-mono text-xs">{cell.summary}</span>
                              ) : (
                                <CellStatusBadge status={cell.status} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </SectionTable>

                <SectionTable title="Updates">
                  <thead>
                    <tr>
                      <th className={tableHeadCls}>Field</th>
                      {ENV_COLUMNS.map((col) => <th key={col.id} className={tableHeadCls}>{col.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.updates.map((row) => (
                      <tr key={row.field} className={cn("border-b border-border last:border-0", row.diff && "bg-status-warn/7")}>
                        <td className={cn(tableCellCls, "font-mono text-xs")}>{row.field}</td>
                        {ENV_COLUMNS.map((col) => (
                          <td key={col.id} className={cn(tableCellCls, "font-mono text-xs text-muted-foreground")}>
                            {row.values[col.id] === null ? "—" : row.values[col.id] || "(empty)"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </SectionTable>

                <SectionTable title="In-App Purchases">
                  <thead>
                    <tr>
                      <th className={tableHeadCls}>Field</th>
                      {ENV_COLUMNS.map((col) => <th key={col.id} className={tableHeadCls}>{col.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.iap.map((row) => (
                      <tr key={row.field} className={cn("border-b border-border last:border-0", row.diff && "bg-status-warn/7")}>
                        <td className={cn(tableCellCls, "font-mono text-xs")}>{row.field}</td>
                        {ENV_COLUMNS.map((col) => (
                          <td key={col.id} className={cn(tableCellCls, "font-mono text-xs text-muted-foreground")}>
                            {row.values[col.id] === null ? "—" : row.values[col.id] || "(empty)"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </SectionTable>
              </>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <Button variant="outline" size="sm" disabled={loading} onClick={load}>{loading ? "Comparing…" : "Refresh"}</Button>
            <Button size="sm" onClick={() => handleOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
