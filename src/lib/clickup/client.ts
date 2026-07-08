import type { ClickUpRawMessage, ClickUpPrItem, ClickUpPage, ClickUpSprint, ClickUpMember, ClickUpSignoffTask, ClickUpSignoffPage } from "./types";

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

const SIGNOFF_DOC_NAME = "Deployment Sign-offs";

interface SignoffClickUpConfig {
  baseUrl: string;
  token: string;
  workspaceId: string;
  docsFolderId: string;
}

function requireSignoffConfig(): SignoffClickUpConfig {
  const baseUrl = process.env.CLICKUP_BASE_URL ?? "https://api.clickup.com/api/v3";
  const token = process.env.CLICKUP_PERSONAL_TOKEN_ELRA;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
  const docsFolderId = process.env.CLICKUP_SIGNOFF_DOCS_FOLDER_ID;
  if (!token || !workspaceId || !docsFolderId) {
    throw new Error("Missing CLICKUP_PERSONAL_TOKEN_ELRA, CLICKUP_WORKSPACE_ID, or CLICKUP_SIGNOFF_DOCS_FOLDER_ID");
  }
  return { baseUrl, token, workspaceId, docsFolderId };
}

// All sign-offs live as separate pages inside one dedicated doc (rather than one doc each).
async function findSignoffDocId(config: SignoffClickUpConfig): Promise<string | null> {
  const { baseUrl, token, workspaceId, docsFolderId } = config;
  const url = new URL(`${baseUrl}/workspaces/${workspaceId}/docs`);
  url.searchParams.set("parent_id", docsFolderId);
  url.searchParams.set("parent_type", "5");
  url.searchParams.set("limit", "50");

  const res = await fetch(url.toString(), { headers: { Authorization: token }, cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  type RawDoc = { id: string; name: string };
  const docs: RawDoc[] = json.docs ?? [];
  return docs.find((d) => d.name === SIGNOFF_DOC_NAME)?.id ?? null;
}

async function getOrCreateSignoffDocId(config: SignoffClickUpConfig): Promise<string> {
  const existing = await findSignoffDocId(config);
  if (existing) return existing;

  const { baseUrl, token, workspaceId, docsFolderId } = config;
  const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/docs`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ name: SIGNOFF_DOC_NAME, parent: { id: docsFolderId, type: 5 }, create_page: false }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }
  const doc = await res.json();
  return doc.id;
}

export async function createSignoffPage(name: string, content: string): Promise<{ id: string; url: string }> {
  const config = requireSignoffConfig();
  const docId = await getOrCreateSignoffDocId(config);

  const res = await fetch(`${config.baseUrl}/workspaces/${config.workspaceId}/docs/${docId}/pages`, {
    method: "POST",
    headers: { Authorization: config.token, "Content-Type": "application/json" },
    body: JSON.stringify({ name, content, content_format: "text/md" }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }
  const page = await res.json();
  return { id: page.id, url: `https://app.clickup.com/${config.workspaceId}/v/dc/${docId}/${page.id}` };
}

export async function listSignoffPages(): Promise<ClickUpSignoffPage[]> {
  const config = requireSignoffConfig();
  const docId = await findSignoffDocId(config);
  if (!docId) return [];

  const res = await fetch(`${config.baseUrl}/workspaces/${config.workspaceId}/docs/${docId}/pages`, {
    headers: { Authorization: config.token },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  type RawPage = { id: string; name: string; date_created: number; date_updated: number };
  const pages: RawPage[] = Array.isArray(json) ? json : [];
  return pages
    .map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: new Date(Number(p.date_created)).toISOString(),
      updatedAt: new Date(Number(p.date_updated)).toISOString(),
      htmlUrl: `https://app.clickup.com/${config.workspaceId}/v/dc/${docId}/${p.id}`,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSignoffPageContent(pageId: string): Promise<string | null> {
  const config = requireSignoffConfig();
  const docId = await findSignoffDocId(config);
  if (!docId) return null;

  const url = new URL(`${config.baseUrl}/workspaces/${config.workspaceId}/docs/${docId}/pages`);
  url.searchParams.set("content_format", "text/md");

  const res = await fetch(url.toString(), { headers: { Authorization: config.token }, cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }

  // ClickUp ignores the page_ids filter on this endpoint and always returns every page,
  // so the match has to happen client-side.
  const json = await res.json();
  type RawPage = { id: string; content: string };
  const pages: RawPage[] = Array.isArray(json) ? json : [];
  return pages.find((p) => p.id === pageId)?.content ?? null;
}

export async function updateSignoffPage(pageId: string, content: string): Promise<void> {
  const config = requireSignoffConfig();
  const docId = await findSignoffDocId(config);
  if (!docId) throw new Error("Sign-off document not found");

  const res = await fetch(`${config.baseUrl}/workspaces/${config.workspaceId}/docs/${docId}/pages/${pageId}`, {
    method: "PUT",
    headers: { Authorization: config.token, "Content-Type": "application/json" },
    body: JSON.stringify({ content, content_format: "text/md" }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }
}

async function findChannelIdByName(baseUrl: string, token: string, workspaceId: string, channelName: string): Promise<string> {
  const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/chat/channels?limit=100`, {
    headers: { Authorization: token },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  type RawChannel = { id: string; name?: string };
  const channels: RawChannel[] = json.data ?? [];
  const match = channels.find((c) => c.name?.toLowerCase() === channelName.toLowerCase());
  if (!match) throw new Error(`ClickUp channel "${channelName}" not found`);
  return match.id;
}

export async function shareSignoffToProductSync(content: string): Promise<void> {
  const baseUrl = process.env.CLICKUP_BASE_URL ?? "https://api.clickup.com/api/v3";
  const token = process.env.CLICKUP_PERSONAL_TOKEN_SUPPORT;
  const workspaceId = process.env.CLICKUP_WORKSPACE_ID;
  if (!token || !workspaceId) {
    throw new Error("Missing CLICKUP_PERSONAL_TOKEN_SUPPORT or CLICKUP_WORKSPACE_ID");
  }

  const channelId = await findChannelIdByName(baseUrl, token, workspaceId, "Product Sync");

  const res = await fetch(`${baseUrl}/workspaces/${workspaceId}/chat/channels/${channelId}/messages`, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "message", content, content_format: "text/md" }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ClickUp API error ${res.status}: ${body.slice(0, 200)}`);
  }
}
