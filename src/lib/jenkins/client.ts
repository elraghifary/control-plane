interface JenkinsConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
  jobToken: string;
}

function requireJenkinsConfig(): JenkinsConfig {
  const baseUrl = process.env.JENKINS_BASE_URL;
  const username = process.env.JENKINS_USERNAME;
  const apiToken = process.env.JENKINS_API_TOKEN;
  const jobToken = process.env.JENKINS_JOB_TOKEN;
  if (!baseUrl || !username || !apiToken || !jobToken) {
    throw new Error("Missing JENKINS_BASE_URL, JENKINS_USERNAME, JENKINS_API_TOKEN, or JENKINS_JOB_TOKEN");
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), username, apiToken, jobToken };
}

async function fetchCrumbHeader(config: JenkinsConfig, authHeader: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${config.baseUrl}/crumbIssuer/api/json`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    });
    if (!res.ok) return {};
    const json = await res.json();
    if (!json.crumbRequestField || !json.crumb) return {};
    return { [json.crumbRequestField]: json.crumb };
  } catch {
    // Crumb issuer may be disabled on this Jenkins instance — trigger without it.
    return {};
  }
}

export async function triggerProductionRelease(repoName: string, tag: string): Promise<{ queueUrl: string | null }> {
  const config = requireJenkinsConfig();
  const authHeader = `Basic ${Buffer.from(`${config.username}:${config.apiToken}`).toString("base64")}`;
  const crumbHeader = await fetchCrumbHeader(config, authHeader);

  const jobName = `${repoName}-release`;
  const url = new URL(`${config.baseUrl}/job/${jobName}/buildWithParameters`);
  url.searchParams.set("TAG", tag);
  url.searchParams.set("token", config.jobToken);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: authHeader, ...crumbHeader },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Jenkins API error ${res.status}: ${body.slice(0, 200)}`);
  }

  return { queueUrl: res.headers.get("location") };
}

export async function resolveQueueItemBuildUrl(queueUrl: string): Promise<string | null> {
  const config = requireJenkinsConfig();
  const authHeader = `Basic ${Buffer.from(`${config.username}:${config.apiToken}`).toString("base64")}`;

  const apiUrl = `${queueUrl.replace(/\/$/, "")}/api/json`;
  const res = await fetch(apiUrl, { headers: { Authorization: authHeader }, cache: "no-store" });
  if (!res.ok) return null;

  const json = await res.json();
  return json.executable?.url ?? null;
}
