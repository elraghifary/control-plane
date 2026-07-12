import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getFirestore, isEnvConfigured } from "./firebase-admin";
import type { Environment } from "./env-config";
import type { AuditEntryDTO } from "./types";

const AUDIT_COLLECTION = "audit_log";

/**
 * Record a mutation for audit. Best-effort: a failure here never propagates,
 * so the underlying mutation is not rolled back or blocked by audit issues.
 */
export async function logAudit(
  env: Environment,
  editor: string,
  entry: { action: string; collection: string; docId?: string | null },
): Promise<void> {
  try {
    await getFirestore(env).collection(AUDIT_COLLECTION).add({
      action: entry.action,
      collection: entry.collection,
      docId: entry.docId ?? null,
      editor,
      at: FieldValue.serverTimestamp(),
    });
  } catch {
    // audit is best-effort
  }
}

export async function countAuditEntries(env: Environment): Promise<number> {
  if (!isEnvConfigured(env)) return 0;
  const snap = await getFirestore(env).collection(AUDIT_COLLECTION).count().get();
  return snap.data().count;
}

export async function listAudit(env: Environment, limit = 50): Promise<AuditEntryDTO[]> {
  if (!isEnvConfigured(env)) return [];
  const snap = await getFirestore(env)
    .collection(AUDIT_COLLECTION)
    .orderBy("at", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const at = d.get("at") as { toDate?: () => Date } | undefined;
    return {
      id: d.id,
      action: String(d.get("action") ?? ""),
      collection: String(d.get("collection") ?? ""),
      docId: d.get("docId") ? String(d.get("docId")) : null,
      editor: String(d.get("editor") ?? ""),
      at: at?.toDate ? at.toDate().toISOString() : null,
    };
  });
}
