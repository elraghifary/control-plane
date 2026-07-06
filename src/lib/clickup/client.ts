import type { ClickUpRawMessage, ClickUpPrItem, ClickUpPage, ClickUpSprint, ClickUpMember, ClickUpSignoffTask } from "./types";

const PR_URL_RE = /https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/g;
const V2_BASE_URL = "https://api.clickup.com/api/v2";
const SIGNOFF_TASK_STATUSES = ["ready to test", "testing", "test passed", "deployed"];

async function fetchTeamMembers(token: string, workspaceId: string): Promise<ClickUpMember[]> {
  const res = await fetch(`${V2_BASE_URL}/team`, {
    headers: { Authorization: token },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  type RawTeam = { id: string; members?: Array<{ user: { id: number; username: string; email: string } }> };
  const teams: RawTeam[] = json.teams ?? [];
  const team = teams.find((t) => String(t.id) === String(workspaceId)) ?? teams[0];
  return (team?.members ?? []).map((m) => ({ id: m.user.id, name: m.user.username, email: m.user.email }));
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
  const token = process.env.CLICKUP_PERSONAL_TOKEN_SUPPORT;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
  const channelId = process.env.CLICKUP_CHANNEL_ID;

  if (!token || !channelId || !workspaceId) {
    throw new Error("Missing CLICKUP_PERSONAL_TOKEN_SUPPORT, CLICKUP_WORKSPACE_ID, or CLICKUP_CHANNEL_ID");
  }

  const url = new URL(`${baseUrl}/workspaces/${workspaceId}/chat/channels/${channelId}/messages`);
  url.searchParams.set("limit", "10");
  if (cursor) url.searchParams.set("cursor", cursor);

  const [res, members] = await Promise.all([
    fetch(url.toString(), { headers: { Authorization: token }, cache: "no-store" }),
    fetchTeamMembers(token, workspaceId).catch(() => [] as ClickUpMember[]),
  ]);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();

  const messages: ClickUpRawMessage[] = Array.isArray(json.data) ? json.data : [];
  const nextCursor: string | null = json.next_cursor || null;
  const hasMore = !!nextCursor;

  const userMap: Record<string, string> = {};
  for (const m of members) userMap[String(m.id)] = m.name;

  const items = messages
    .filter((m) => m.content)
    .flatMap((m) => extractPrItems(m, userMap));

  return { items, nextCursor, hasMore };
}

export async function sendReplyMessage(messageId: string, content: string): Promise<void> {
  const baseUrl = process.env.CLICKUP_BASE_URL ?? "https://api.clickup.com/api/v3";
  const token = process.env.CLICKUP_PERSONAL_TOKEN_SUPPORT;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;

  if (!token || !workspaceId) {
    throw new Error("Missing CLICKUP_PERSONAL_TOKEN_SUPPORT or CLICKUP_WORKSPACE_ID");
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

export async function listSprints(): Promise<ClickUpSprint[]> {
  const token = process.env.CLICKUP_PERSONAL_TOKEN_ELRA;
  const folderId = process.env.CLICKUP_SIGNOFF_SPRINT_FOLDER_ID;
  if (!token || !folderId) {
    throw new Error("Missing CLICKUP_PERSONAL_TOKEN_ELRA or CLICKUP_SIGNOFF_SPRINT_FOLDER_ID");
  }

  const res = await fetch(`${V2_BASE_URL}/folder/${folderId}/list`, {
    headers: { Authorization: token },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const lists: Array<{ id: string; name: string }> = json.lists ?? [];
  return lists.map((l) => ({ id: l.id, name: l.name }));
}

export async function listWorkspaceMembers(): Promise<ClickUpMember[]> {
  const token = process.env.CLICKUP_PERSONAL_TOKEN_ELRA;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
  if (!token || !workspaceId) {
    throw new Error("Missing CLICKUP_PERSONAL_TOKEN_ELRA or CLICKUP_WORKSPACE_ID");
  }
  return fetchTeamMembers(token, workspaceId);
}

export async function listSprintTasks(sprintListId: string): Promise<ClickUpSignoffTask[]> {
  const token = process.env.CLICKUP_PERSONAL_TOKEN_ELRA;
  if (!token) throw new Error("Missing CLICKUP_PERSONAL_TOKEN_ELRA");
  const assigneeIds = (process.env.CLICKUP_SIGNOFF_ASSIGNEE_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const url = new URL(`${V2_BASE_URL}/list/${sprintListId}/task`);
  url.searchParams.set("include_timl", "true");
  for (const id of assigneeIds) url.searchParams.append("assignees", id);
  for (const status of SIGNOFF_TASK_STATUSES) url.searchParams.append("statuses", status);

  const res = await fetch(url.toString(), {
    headers: { Authorization: token },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  type RawTask = { id: string; name: string; url: string; assignees?: Array<{ email: string }> };
  const tasks: RawTask[] = json.tasks ?? [];
  return tasks.map((t) => ({
    id: t.id,
    name: t.name,
    url: t.url,
    assigneeEmails: (t.assignees ?? []).map((a) => a.email),
  }));
}

export async function createSignoffDoc(name: string, content: string): Promise<{ id: string; url: string }> {
  const baseUrl = process.env.CLICKUP_BASE_URL ?? "https://api.clickup.com/api/v3";
  const token = process.env.CLICKUP_PERSONAL_TOKEN_ELRA;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
  const docsFolderId = process.env.CLICKUP_SIGNOFF_DOCS_FOLDER_ID;
  if (!token || !workspaceId || !docsFolderId) {
    throw new Error("Missing CLICKUP_PERSONAL_TOKEN_ELRA, CLICKUP_WORKSPACE_ID, or CLICKUP_SIGNOFF_DOCS_FOLDER_ID");
  }

  const docRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/docs`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ name, parent: { id: docsFolderId, type: 5 }, create_page: false }),
  });
  if (!docRes.ok) {
    const body = await docRes.text().catch(() => "");
    throw new Error(`ClickUp API error ${docRes.status}: ${body.slice(0, 200)}`);
  }
  const doc = await docRes.json();

  const pageRes = await fetch(`${baseUrl}/workspaces/${workspaceId}/docs/${doc.id}/pages`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ name, content, content_format: "text/md" }),
  });
  if (!pageRes.ok) {
    const body = await pageRes.text().catch(() => "");
    throw new Error(`ClickUp API error ${pageRes.status}: ${body.slice(0, 200)}`);
  }

  return { id: doc.id, url: `https://app.clickup.com/${workspaceId}/v/dc/${doc.id}` };
}
