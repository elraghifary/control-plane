"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isEnvironment, ENVIRONMENTS, type Environment } from "@/lib/apps/env-config";
import { getFirestore, isEnvConfigured } from "@/lib/apps/firebase-admin";
import { encrypt, decrypt } from "@/lib/apps/crypto";
import { logAudit, listAudit as listAuditEntries, countAuditEntries } from "@/lib/apps/audit";
import { EXPECTED_SECRET_KEYS, CRITICAL_SECRET_KEYS } from "@/lib/apps/expected-secrets";
import {
  compareSecrets,
  compareFeatureFlags,
  compareDocFields,
  type CellStatus,
  type SecretPresence,
  type FlagPresence,
} from "@/lib/apps/compare";
import type {
  SecretDTO,
  AuditEntryDTO,
  FeatureFlagDTO,
  UpdateConfigDTO,
  IapConfigDTO,
  SearchRow,
  Comparison,
  EnvHealth,
} from "@/lib/apps/types";

const ENV_COLLECTION = "env";
const INFO_COLLECTION = "env_info";
const INFO_DOC = "info";
const FEATURE_FLAGS_COLLECTION = "feature_flags";
const UPDATES_COLLECTION = "updates";
const IAP_COLLECTION = "iap";
const UPDATE_FIELDS = ["isShow", "minVersion", "androidUrl", "iosUrl"];
const IAP_FIELDS = ["showAndroid", "showIos", "showInternalTesting", "androidProductIds", "iosProductIds"];

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

function assertEnv(env: string): asserts env is Environment {
  if (!isEnvironment(env)) throw new Error(`Invalid environment: ${env}`);
}

export async function listSecretsAction(env: string): Promise<{ ok: boolean; secrets: SecretDTO[]; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, secrets: [], error: "Not authenticated." };
  try {
    assertEnv(env);
    if (!isEnvConfigured(env)) return { ok: true, secrets: [] };
    const snap = await getFirestore(env).collection(ENV_COLLECTION).orderBy("key").get();
    const secrets = snap.docs.map((d) => ({
      id: d.id,
      key: String(d.get("key") ?? d.id),
      value: String(d.get("value") ?? ""),
    }));
    return { ok: true, secrets };
  } catch (e) {
    return { ok: false, secrets: [], error: e instanceof Error ? e.message : "Could not load secrets" };
  }
}

export async function revealSecretAction(env: string, id: string): Promise<{ ok: boolean; value?: string; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    const doc = await getFirestore(env).collection(ENV_COLLECTION).doc(id).get();
    if (!doc.exists) return { ok: true, value: "" };
    return { ok: true, value: decrypt(String(doc.get("value") ?? "")) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reveal secret" };
  }
}

export async function createSecretAction(env: string, key: string, plaintext: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    const trimmed = key.trim();
    if (!trimmed) return { ok: false, error: "Key is required" };
    await getFirestore(env).collection(ENV_COLLECTION).add({ key: trimmed, value: encrypt(plaintext) });
    await logAudit(env, session.user.githubLogin ?? "unknown", { action: "create", collection: "env", docId: trimmed });
    revalidatePath(`/apps/secrets`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create secret" };
  }
}

export async function updateSecretAction(env: string, id: string, plaintext: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    await getFirestore(env).collection(ENV_COLLECTION).doc(id).update({ value: encrypt(plaintext) });
    await logAudit(env, session.user.githubLogin ?? "unknown", { action: "update", collection: "env", docId: id });
    revalidatePath(`/apps/secrets`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update secret" };
  }
}

export async function deleteSecretAction(env: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    await getFirestore(env).collection(ENV_COLLECTION).doc(id).delete();
    await logAudit(env, session.user.githubLogin ?? "unknown", { action: "delete", collection: "env", docId: id });
    revalidatePath(`/apps/secrets`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete secret" };
  }
}

export async function getEnvInfoAction(env: string): Promise<{ ok: boolean; info?: { version: string } | null; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    if (!isEnvConfigured(env)) return { ok: true, info: null };
    const snap = await getFirestore(env).collection(INFO_COLLECTION).limit(1).get();
    if (snap.empty) return { ok: true, info: null };
    return { ok: true, info: { version: String(snap.docs[0].get("version") ?? "") } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not load environment info" };
  }
}

export async function bumpVersionAction(env: string): Promise<{ ok: boolean; version?: string; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    const col = getFirestore(env).collection(INFO_COLLECTION);
    const snap = await col.limit(1).get();
    // version is an integer stored AS A STRING (e.g. "8"). The HappyKids mobile app compares
    // with strict !== and persists it into SecureStore (string-only). Must stay a string,
    // otherwise "8" !== 8 forces a re-download on every launch. Increment by 1.
    const current = snap.empty ? 0 : parseInt(String(snap.docs[0].get("version") ?? "0"), 10);
    const nextVersion = String((Number.isFinite(current) ? current : 0) + 1);
    if (snap.empty) {
      await col.doc(INFO_DOC).set({ version: nextVersion, version_storage_key: "env_version" });
    } else {
      await snap.docs[0].ref.update({ version: nextVersion });
    }
    await logAudit(env, session.user.githubLogin ?? "unknown", { action: "bump-version", collection: "env_info", docId: nextVersion });
    revalidatePath(`/apps/secrets`);
    return { ok: true, version: nextVersion };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not bump version" };
  }
}

export async function listAuditAction(env: string, limit = 50): Promise<{ ok: boolean; entries: AuditEntryDTO[]; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, entries: [], error: "Not authenticated." };
  try {
    assertEnv(env);
    return { ok: true, entries: await listAuditEntries(env, limit) };
  } catch (e) {
    return { ok: false, entries: [], error: e instanceof Error ? e.message : "Could not load audit logs" };
  }
}

export async function countAuditAction(env: string): Promise<{ ok: boolean; count: number; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, count: 0, error: "Not authenticated." };
  try {
    assertEnv(env);
    return { ok: true, count: await countAuditEntries(env) };
  } catch (e) {
    return { ok: false, count: 0, error: e instanceof Error ? e.message : "Could not count audit logs" };
  }
}

export async function listFeatureFlagsAction(env: string): Promise<{ ok: boolean; flags: FeatureFlagDTO[]; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, flags: [], error: "Not authenticated." };
  try {
    assertEnv(env);
    if (!isEnvConfigured(env)) return { ok: true, flags: [] };
    const snap = await getFirestore(env).collection(FEATURE_FLAGS_COLLECTION).get();
    const flags = snap.docs
      .map((d) => ({
        id: d.id,
        isShowAndroid: !!d.get("isShowAndroid"),
        isShowIos: !!d.get("isShowIos"),
        minVersion: String(d.get("minVersion") ?? ""),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return { ok: true, flags };
  } catch (e) {
    return { ok: false, flags: [], error: e instanceof Error ? e.message : "Could not load feature flags" };
  }
}

export async function createFeatureFlagAction(
  env: string,
  id: string,
  data: { isShowAndroid: boolean; isShowIos: boolean; minVersion: string },
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    const trimmed = id.trim();
    if (!trimmed) return { ok: false, error: "Flag key is required" };
    const ref = getFirestore(env).collection(FEATURE_FLAGS_COLLECTION).doc(trimmed);
    if ((await ref.get()).exists) return { ok: false, error: `Flag "${trimmed}" already exists` };
    await ref.set(data);
    await logAudit(env, session.user.githubLogin ?? "unknown", { action: "create", collection: FEATURE_FLAGS_COLLECTION, docId: trimmed });
    revalidatePath(`/apps/feature-flags`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create feature flag" };
  }
}

export async function updateFeatureFlagAction(
  env: string,
  id: string,
  data: Partial<{ isShowAndroid: boolean; isShowIos: boolean; minVersion: string }>,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    await getFirestore(env).collection(FEATURE_FLAGS_COLLECTION).doc(id).update(data);
    await logAudit(env, session.user.githubLogin ?? "unknown", { action: "update", collection: FEATURE_FLAGS_COLLECTION, docId: id });
    revalidatePath(`/apps/feature-flags`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update feature flag" };
  }
}

export async function deleteFeatureFlagAction(env: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    await getFirestore(env).collection(FEATURE_FLAGS_COLLECTION).doc(id).delete();
    await logAudit(env, session.user.githubLogin ?? "unknown", { action: "delete", collection: FEATURE_FLAGS_COLLECTION, docId: id });
    revalidatePath(`/apps/feature-flags`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete feature flag" };
  }
}

export async function getUpdateConfigAction(env: string): Promise<{ ok: boolean; config: UpdateConfigDTO | null; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, config: null, error: "Not authenticated." };
  try {
    assertEnv(env);
    if (!isEnvConfigured(env)) return { ok: true, config: null };
    const snap = await getFirestore(env).collection(UPDATES_COLLECTION).limit(1).get();
    if (snap.empty) return { ok: true, config: null };
    const doc = snap.docs[0];
    return {
      ok: true,
      config: {
        id: doc.id,
        isShow: !!doc.get("isShow"),
        minVersion: String(doc.get("minVersion") ?? ""),
        androidUrl: String(doc.get("androidUrl") ?? ""),
        iosUrl: String(doc.get("iosUrl") ?? ""),
      },
    };
  } catch (e) {
    return { ok: false, config: null, error: e instanceof Error ? e.message : "Could not load update config" };
  }
}

export async function saveUpdateConfigAction(
  env: string,
  data: { isShow: boolean; minVersion: string; androidUrl: string; iosUrl: string },
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    const col = getFirestore(env).collection(UPDATES_COLLECTION);
    const snap = await col.limit(1).get();
    if (snap.empty) {
      await col.add(data);
    } else {
      await snap.docs[0].ref.update(data);
    }
    await logAudit(env, session.user.githubLogin ?? "unknown", { action: "save", collection: UPDATES_COLLECTION });
    revalidatePath(`/apps/updates`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save update config" };
  }
}

export async function getIapConfigAction(env: string): Promise<{ ok: boolean; config: IapConfigDTO | null; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, config: null, error: "Not authenticated." };
  try {
    assertEnv(env);
    if (!isEnvConfigured(env)) return { ok: true, config: null };
    const snap = await getFirestore(env).collection(IAP_COLLECTION).limit(1).get();
    if (snap.empty) return { ok: true, config: null };
    const doc = snap.docs[0];
    const toStringArray = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : []);
    return {
      ok: true,
      config: {
        id: doc.id,
        androidProductIds: toStringArray(doc.get("androidProductIds")),
        iosProductIds: toStringArray(doc.get("iosProductIds")),
        showAndroid: !!doc.get("showAndroid"),
        showIos: !!doc.get("showIos"),
        showInternalTesting: !!doc.get("showInternalTesting"),
      },
    };
  } catch (e) {
    return { ok: false, config: null, error: e instanceof Error ? e.message : "Could not load in-app purchases config" };
  }
}

export async function saveIapConfigAction(
  env: string,
  data: { androidProductIds: string[]; iosProductIds: string[]; showAndroid: boolean; showIos: boolean; showInternalTesting: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, error: "Not authenticated." };
  try {
    assertEnv(env);
    const col = getFirestore(env).collection(IAP_COLLECTION);
    const snap = await col.limit(1).get();
    if (snap.empty) {
      await col.add(data);
    } else {
      await snap.docs[0].ref.update(data);
    }
    await logAudit(env, session.user.githubLogin ?? "unknown", { action: "save", collection: IAP_COLLECTION });
    revalidatePath(`/apps/in-app-purchases`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save in-app purchases config" };
  }
}

// Search, Compare, and Health are cross-environment — they always read all 3
// environments at once rather than the single cookie-selected one.

export async function searchSecretKeysAction(query: string): Promise<{ ok: boolean; rows: SearchRow[]; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, rows: [], error: "Not authenticated." };
  try {
    const q = query.trim().toLowerCase();
    if (!q) return { ok: true, rows: [] };

    const perEnv = {} as Record<Environment, { key: string; isEmpty: boolean }[] | null>;
    await Promise.all(
      ENVIRONMENTS.map(async ({ id: env }) => {
        if (!isEnvConfigured(env)) {
          perEnv[env] = null;
          return;
        }
        const snap = await getFirestore(env).collection(ENV_COLLECTION).orderBy("key").get();
        perEnv[env] = snap.docs.map((d) => ({
          key: String(d.get("key") ?? d.id),
          isEmpty: decrypt(String(d.get("value") ?? "")) === "",
        }));
      }),
    );

    const keys = new Set<string>();
    for (const { id: env } of ENVIRONMENTS) {
      const list = perEnv[env];
      if (list) for (const s of list) if (s.key.toLowerCase().includes(q)) keys.add(s.key);
    }

    const rows: SearchRow[] = [...keys].sort().map((key) => {
      const cells = { development: "missing", preview: "missing", production: "missing" } as Record<Environment, CellStatus>;
      for (const { id: env } of ENVIRONMENTS) {
        const list = perEnv[env];
        if (list === null) { cells[env] = "na"; continue; }
        const found = list.find((s) => s.key === key);
        cells[env] = !found ? "missing" : found.isEmpty ? "empty" : "present";
      }
      return { key, cells };
    });

    return { ok: true, rows };
  } catch (e) {
    return { ok: false, rows: [], error: e instanceof Error ? e.message : "Could not search secrets" };
  }
}

export async function getComparisonAction(): Promise<{ ok: boolean; comparison: Comparison | null; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, comparison: null, error: "Not authenticated." };
  try {
    const configured = {} as Record<Environment, boolean>;
    const secretsPer = {} as Record<Environment, SecretPresence[] | null>;
    const flagsPer = {} as Record<Environment, FlagPresence[] | null>;
    const updatesPer = {} as Record<Environment, Record<string, string> | null>;
    const iapPer = {} as Record<Environment, Record<string, string> | null>;

    await Promise.all(
      ENVIRONMENTS.map(async ({ id: env }) => {
        const ok = isEnvConfigured(env);
        configured[env] = ok;
        if (!ok) {
          secretsPer[env] = null;
          flagsPer[env] = null;
          updatesPer[env] = null;
          iapPer[env] = null;
          return;
        }
        const [secretsSnap, flagsSnap, updatesSnap, iapSnap] = await Promise.all([
          getFirestore(env).collection(ENV_COLLECTION).orderBy("key").get(),
          getFirestore(env).collection(FEATURE_FLAGS_COLLECTION).get(),
          getFirestore(env).collection(UPDATES_COLLECTION).limit(1).get(),
          getFirestore(env).collection(IAP_COLLECTION).limit(1).get(),
        ]);

        secretsPer[env] = secretsSnap.docs.map((d) => {
          const key = String(d.get("key") ?? d.id);
          const plain = decrypt(String(d.get("value") ?? ""));
          return { key, isEmpty: plain === "" };
        });

        flagsPer[env] = flagsSnap.docs.map((d) => ({
          id: d.id,
          isShowAndroid: !!d.get("isShowAndroid"),
          isShowIos: !!d.get("isShowIos"),
          minVersion: String(d.get("minVersion") ?? ""),
        }));

        updatesPer[env] = updatesSnap.empty
          ? {}
          : {
              isShow: String(!!updatesSnap.docs[0].get("isShow")),
              minVersion: String(updatesSnap.docs[0].get("minVersion") ?? ""),
              androidUrl: String(updatesSnap.docs[0].get("androidUrl") ?? ""),
              iosUrl: String(updatesSnap.docs[0].get("iosUrl") ?? ""),
            };

        iapPer[env] = iapSnap.empty
          ? {}
          : {
              showAndroid: String(!!iapSnap.docs[0].get("showAndroid")),
              showIos: String(!!iapSnap.docs[0].get("showIos")),
              showInternalTesting: String(!!iapSnap.docs[0].get("showInternalTesting")),
              androidProductIds: ((iapSnap.docs[0].get("androidProductIds") as string[] | undefined) ?? []).join(", "),
              iosProductIds: ((iapSnap.docs[0].get("iosProductIds") as string[] | undefined) ?? []).join(", "),
            };
      }),
    );

    const comparison: Comparison = {
      configured,
      secrets: compareSecrets(secretsPer, EXPECTED_SECRET_KEYS, CRITICAL_SECRET_KEYS),
      flags: compareFeatureFlags(flagsPer),
      updates: compareDocFields(updatesPer, UPDATE_FIELDS),
      iap: compareDocFields(iapPer, IAP_FIELDS),
    };
    return { ok: true, comparison };
  } catch (e) {
    return { ok: false, comparison: null, error: e instanceof Error ? e.message : "Could not compare environments" };
  }
}

export async function getHealthAction(): Promise<{ ok: boolean; results: EnvHealth[]; error?: string }> {
  const session = await requireSession();
  if (!session) return { ok: false, results: [], error: "Not authenticated." };
  try {
    const results = await Promise.all(
      ENVIRONMENTS.map(async (meta): Promise<EnvHealth> => {
        if (!isEnvConfigured(meta.id)) {
          return { env: meta.id, label: meta.label, configured: false, ok: false, error: null };
        }
        try {
          await getFirestore(meta.id).collection(ENV_COLLECTION).limit(1).get();
          return { env: meta.id, label: meta.label, configured: true, ok: true, error: null };
        } catch (e) {
          return { env: meta.id, label: meta.label, configured: true, ok: false, error: e instanceof Error ? e.message : String(e) };
        }
      }),
    );
    return { ok: true, results };
  } catch (e) {
    return { ok: false, results: [], error: e instanceof Error ? e.message : "Could not check health" };
  }
}
