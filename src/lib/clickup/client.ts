import type { ClickUpRawMessage, ClickUpPrItem, ClickUpPage } from "./types";

const PR_URL_RE = /https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/g;

function parseUserMap(): Record<string, string> {
  const raw = process.env.CLICKUP_USER_IDS ?? "";
  const map: Record<string, string> = {};
  for (const entry of raw.split(":").filter(Boolean)) {
    const lastHyphen = entry.lastIndexOf("-");
    if (lastHyphen > 0) {
      const name = entry.slice(0, lastHyphen);
      const id = entry.slice(lastHyphen + 1);
      map[id] = name;
    }
  }
  return map;
}

function extractPrItems(msg: ClickUpRawMessage, userMap: Record<string, string>): ClickUpPrItem[] {
  const items: ClickUpPrItem[] = [];
  const seen = new Set<string>();
  const author = userMap[String(msg.user_id)] ?? String(msg.user_id ?? "Unknown");
  PR_URL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PR_URL_RE.exec(msg.content)) !== null) {
    const prUrl = match[0];
    if (seen.has(prUrl)) continue;
    seen.add(prUrl);
    items.push({
      prUrl,
      owner: match[1],
      repo: match[2],
      prNumber: parseInt(match[3], 10),
      messageId: msg.id,
      author,
      date: String(msg.date ?? ""),
    });
  }
  return items;
}

export async function fetchClickUpPage(cursor?: string): Promise<ClickUpPage> {
  const baseUrl = process.env.CLICKUP_BASE_URL ?? "https://api.clickup.com/api/v3";
  const token = process.env.CLICKUP_PERSONAL_TOKEN;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
  const channelId = process.env.CLICKUP_CHANNEL_ID;

  if (!token || !channelId || !workspaceId) {
    throw new Error("Missing CLICKUP_PERSONAL_TOKEN, CLICKUP_WORKSPACE_ID, or CLICKUP_CHANNEL_ID");
  }

  const url = new URL(`${baseUrl}/workspaces/${workspaceId}/chat/channels/${channelId}/messages`);
  url.searchParams.set("limit", "10");
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), {
    headers: { Authorization: token },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();

  const messages: ClickUpRawMessage[] = Array.isArray(json.data) ? json.data : [];
  const nextCursor: string | null = json.next_cursor || null;
  const hasMore = !!nextCursor;

  const userMap = parseUserMap();

  const items = messages
    .filter((m) => m.content)
    .flatMap((m) => extractPrItems(m, userMap));

  return { items, nextCursor, hasMore };
}

export async function sendReplyMessage(messageId: string, content: string): Promise<void> {
  const baseUrl = process.env.CLICKUP_BASE_URL ?? "https://api.clickup.com/api/v3";
  const token = process.env.CLICKUP_PERSONAL_TOKEN;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;

  if (!token || !workspaceId) {
    throw new Error("Missing CLICKUP_PERSONAL_TOKEN or CLICKUP_WORKSPACE_ID");
  }

  const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/chat/messages/${messageId}/replies`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "message", content, content_format: "text/md" }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }
}
