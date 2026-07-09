export type ManifestEntryType = "ENV" | "DDL" | "DML" | "Redis" | "Other";
export type ManifestExecuted = "Yes" | "No";

export interface ManifestEntry {
  repository: string;
  type: ManifestEntryType;
  value: string;
  executed: ManifestExecuted;
}

export interface ManifestInput {
  development: ManifestEntry[];
  staging: ManifestEntry[];
  production: ManifestEntry[];
}

const MANIFEST_ENTRY_TYPES: ManifestEntryType[] = ["ENV", "DDL", "DML", "Redis", "Other"];

const MANIFEST_SECTIONS: { key: keyof ManifestInput; heading: string }[] = [
  { key: "development", heading: "Development" },
  { key: "staging", heading: "Staging" },
  { key: "production", heading: "Production" },
];

export function emptyManifestInput(): ManifestInput {
  return { development: [], staging: [], production: [] };
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function unescapeCell(value: string): string {
  // ClickUp's markdown exporter backslash-escapes markdown-special punctuation
  // (e.g. "WEB_URL" comes back as "WEB\_URL") since underscores/asterisks/etc.
  // are markdown syntax — undo that generally, not just for the pipe character.
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\\([\\`*_{}[\]()#+\-.!|>~])/g, "$1");
}

// Strips any backticks left over from a previous version that rendered Value as
// inline code — ClickUp's doc editor round-tripped that inconsistently, so it was
// dropped in favor of plain text. Kept here only to clean up already-saved docs.
function stripValueCodeSpan(value: string): string {
  return value.replace(/^`+/, "").replace(/`+$/, "");
}

function normalizePlaceholder(value: string): string {
  return value === "-" ? "" : value;
}

function splitRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  const inner = trimmed.slice(1, -1);
  return inner.split(/(?<!\\)\|/).map((c) => c.trim());
}

export function buildManifestMarkdown(input: ManifestInput): string {
  const parts: string[] = ["# Deployment Manifest", ""];
  for (const { key, heading } of MANIFEST_SECTIONS) {
    const entries = input[key];
    parts.push(`## ${heading}`, "");
    parts.push("| Repository | Type | Value | Executed |");
    parts.push("| --- | --- | --- | --- |");
    if (entries.length === 0) {
      parts.push("| - | - | - | - |");
    } else {
      for (const e of entries) {
        parts.push(`| ${escapeCell(e.repository)} | ${e.type} | ${escapeCell(e.value)} | ${e.executed} |`);
      }
    }
    parts.push("");
  }
  return `${parts.join("\n").trimEnd()}\n`;
}

export function parseManifestMarkdown(markdown: string): ManifestInput {
  const result = emptyManifestInput();
  const lines = markdown.split(/\r?\n/);
  let currentKey: keyof ManifestInput | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (headingMatch) {
      const found = MANIFEST_SECTIONS.find((s) => s.heading.toLowerCase() === headingMatch[1].trim().toLowerCase());
      currentKey = found ? found.key : null;
      continue;
    }
    if (!currentKey) continue;

    const cells = splitRow(line);
    if (!cells || cells.length < 4) continue;
    const [rawRepository, rawType, rawValue, rawExecuted] = cells;

    if (/^repository$/i.test(rawRepository)) continue; // header row
    if (cells.every((c) => /^:?-{1,}:?$/.test(c))) continue; // separator row

    // "-" is our own placeholder character for an empty cell (see buildManifestMarkdown) —
    // treat it as blank even when only some cells in the row are placeholders, since
    // ClickUp's doc editor doesn't always normalize every cell in a blank row consistently.
    const repository = normalizePlaceholder(unescapeCell(rawRepository).trim());
    const value = normalizePlaceholder(unescapeCell(stripValueCodeSpan(rawValue.trim())).trim());
    // Skip our own placeholder row and any blank row ClickUp's doc editor may
    // normalize an empty table to when the content round-trips through it.
    if (!repository && !value) continue;

    const type = (MANIFEST_ENTRY_TYPES as string[]).includes(rawType) ? (rawType as ManifestEntryType) : "Other";
    const executed: ManifestExecuted = rawExecuted.trim().toLowerCase() === "yes" ? "Yes" : "No";
    result[currentKey].push({ repository, type, value, executed });
  }

  return result;
}
