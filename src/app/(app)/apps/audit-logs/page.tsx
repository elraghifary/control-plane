import { getSelectedEnvironment } from "@/lib/apps/session-env";
import { listAuditAction } from "@/app/(app)/apps/actions";
import { AuditLogList } from "@/components/apps/audit-log-list";
import { ErrorState } from "@/components/states/error-state";

export default async function AppsAuditPage() {
  const environment = await getSelectedEnvironment();

  const res = await listAuditAction(environment);
  if (!res.ok) {
    return <ErrorState title="Failed to load audit logs" description={res.error} />;
  }

  return <AuditLogList entries={res.entries} />;
}
