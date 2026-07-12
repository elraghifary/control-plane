import type { Environment } from "./env-config";
import type { CellStatus, SecretRow, FlagRow, DocFieldRow } from "./compare";

export interface SecretDTO {
  id: string;
  key: string;
  value: string; // ciphertext
}

export interface AuditEntryDTO {
  id: string;
  action: string;
  collection: string;
  docId: string | null;
  editor: string;
  at: string | null; // ISO string
}

export interface FeatureFlagDTO {
  id: string; // doc id = flag key
  isShowAndroid: boolean;
  isShowIos: boolean;
  minVersion: string;
}

export interface UpdateConfigDTO {
  id: string | null; // docs[0] id, or null when no doc exists yet
  isShow: boolean;
  minVersion: string;
  androidUrl: string;
  iosUrl: string;
}

export interface IapConfigDTO {
  id: string | null; // docs[0] id, or null when no doc exists yet
  androidProductIds: string[];
  iosProductIds: string[];
  showAndroid: boolean;
  showIos: boolean;
  showInternalTesting: boolean;
}

export interface SearchRow {
  key: string;
  cells: Record<Environment, CellStatus>;
}

export interface Comparison {
  configured: Record<Environment, boolean>;
  secrets: SecretRow[];
  flags: FlagRow[];
  updates: DocFieldRow[];
  iap: DocFieldRow[];
}

export interface EnvHealth {
  env: Environment;
  label: string;
  configured: boolean;
  ok: boolean;
  error: string | null;
}
