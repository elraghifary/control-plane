import type { Environment } from "./env-config";

export type CellStatus = "present" | "empty" | "missing" | "na";

export interface SecretPresence {
  key: string;
  isEmpty: boolean;
}

export interface SecretRow {
  key: string;
  required: boolean;
  critical: boolean;
  extra: boolean; // present in Firestore but not an expected key
  cells: Record<Environment, CellStatus>;
  hasIssue: boolean; // required and missing/empty in some configured env
}

export interface FlagPresence {
  id: string;
  isShowAndroid: boolean;
  isShowIos: boolean;
  minVersion: string;
}

export interface FlagCell {
  status: CellStatus;
  summary?: string;
}

export interface FlagRow {
  id: string;
  cells: Record<Environment, FlagCell>;
  diff: boolean;
}

export interface DocFieldRow {
  field: string;
  values: Record<Environment, string | null>; // null = env not configured
  diff: boolean;
}

type PerEnv<T> = Record<Environment, T | null>; // null = env not configured

const ENVS: Environment[] = ["development", "preview", "production"];

function emptyCells<T>(fill: T): Record<Environment, T> {
  return { development: fill, preview: fill, production: fill } as Record<Environment, T>;
}

export function compareSecrets(
  perEnv: PerEnv<SecretPresence[]>,
  expected: string[],
  critical: string[],
): SecretRow[] {
  const expectedSet = new Set(expected);
  const criticalSet = new Set(critical);

  const keys = new Set<string>(expected);
  for (const env of ENVS) {
    const list = perEnv[env];
    if (list) for (const s of list) keys.add(s.key);
  }

  const rows: SecretRow[] = [];
  for (const key of [...keys].sort()) {
    const cells = emptyCells<CellStatus>("missing");
    for (const env of ENVS) {
      const list = perEnv[env];
      if (list === null) {
        cells[env] = "na";
        continue;
      }
      const found = list.find((s) => s.key === key);
      cells[env] = !found ? "missing" : found.isEmpty ? "empty" : "present";
    }
    const required = expectedSet.has(key);
    const critical_ = criticalSet.has(key);
    const hasIssue = required && ENVS.some((e) => cells[e] === "missing" || cells[e] === "empty");
    rows.push({ key, required, critical: critical_, extra: !required, cells, hasIssue });
  }
  return rows;
}

export function compareFeatureFlags(perEnv: PerEnv<FlagPresence[]>): FlagRow[] {
  const ids = new Set<string>();
  for (const env of ENVS) {
    const list = perEnv[env];
    if (list) for (const f of list) ids.add(f.id);
  }

  const rows: FlagRow[] = [];
  for (const id of [...ids].sort()) {
    const cells = emptyCells<FlagCell>({ status: "missing" });
    const signatures: string[] = [];
    for (const env of ENVS) {
      const list = perEnv[env];
      if (list === null) {
        cells[env] = { status: "na" };
        continue;
      }
      const f = list.find((x) => x.id === id);
      if (!f) {
        cells[env] = { status: "missing" };
        signatures.push("∅");
        continue;
      }
      const summary = `A${f.isShowAndroid ? "1" : "0"}/I${f.isShowIos ? "1" : "0"}/${f.minVersion || "0.0.0"}`;
      cells[env] = { status: "present", summary };
      signatures.push(summary);
    }
    const diff = new Set(signatures).size > 1;
    rows.push({ id, cells, diff });
  }
  return rows;
}

export function compareDocFields(perEnv: PerEnv<Record<string, string>>, fields: string[]): DocFieldRow[] {
  return fields.map((field) => {
    const values = emptyCells<string | null>(null);
    const present: string[] = [];
    let anyConfigured = false;
    for (const env of ENVS) {
      const doc = perEnv[env];
      if (doc === null) {
        values[env] = null; // na
        continue;
      }
      anyConfigured = true;
      const v = doc[field] ?? "";
      values[env] = v;
      present.push(v);
    }
    // configured envs that are missing the doc surface as "" and still count toward diff
    const diff = anyConfigured && new Set(present).size > 1;
    return { field, values, diff };
  });
}
