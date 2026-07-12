import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-state";
import type { AuditEntryDTO } from "@/lib/apps/types";

const ACTION_BADGE_VARIANT: Record<string, "healthy" | "instrument" | "error" | "warn"> = {
  create: "healthy",
  update: "instrument",
  delete: "error",
  "bump-version": "warn",
};

export function AuditLogList({ entries }: { entries: AuditEntryDTO[] }) {
  if (entries.length === 0) {
    return <EmptyState title="No audit logs yet" />;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur transition-colors hover:border-instrument/30"
        >
          <Badge variant={ACTION_BADGE_VARIANT[entry.action] ?? "default"} size="sm" className="min-w-[72px] justify-center text-center">
            {entry.action}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{entry.collection || "—"}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{entry.docId || "—"}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">{entry.editor || "unknown"}</p>
            <p className="text-xs text-muted-foreground">
              {entry.at ? format(new Date(entry.at), "MMM d, yyyy HH:mm") : "—"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
