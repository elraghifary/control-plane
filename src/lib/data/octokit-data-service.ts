import { Octokit } from "octokit";
import type { DataService } from "./data-service";
import type {
  Repository, DashboardSummary, EnvironmentStatus,
  MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint,
} from "./types";

function parseSlug(slug: string): { owner: string; repo: string } {
  const [owner, repo] = slug.split("/");
  return { owner, repo };
}

export class OctokitDataService implements DataService {
  private octokit: Octokit;
  private orgs: string[];
  private cache = new Map<string, { at: number; value: unknown }>();
  private ttl = 60_000;

  constructor(pat: string, orgs: string[] = []) {
    this.octokit = new Octokit({ auth: pat });
    this.orgs = orgs;
  }

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.ttl) return hit.value as T;
    const value = await fn();
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }

  async listRepositories(): Promise<Repository[]> {
    return this.cached("repos", async () => {
      const own = await this.octokit.paginate(
        this.octokit.rest.repos.listForAuthenticatedUser,
        { per_page: 100, affiliation: "owner,collaborator,organization_member" }
      );
      const orgRepos = (
        await Promise.all(
          this.orgs.map((org) =>
            this.octokit
              .paginate(this.octokit.rest.repos.listForOrg, { org, per_page: 100 })
              .catch(() => [])
          )
        )
      ).flat();
      const byName = new Map<string, Repository>();
      for (const r of [...own, ...orgRepos]) {
        byName.set(r.full_name, {
          id: r.full_name,
          name: r.name,
          slug: r.full_name,
          enabled: true,
          defaultBranch: r.default_branch ?? "main",
        });
      }
      return [...byName.values()].sort((a, b) => a.slug.localeCompare(b.slug));
    });
  }

  async getMergeActivity(slug: string): Promise<MergeActivityPoint[]> {
    return this.cached(`merge:${slug}`, async () => {
      const since = new Date(Date.now() - 13 * 86400000);
      const sinceStr = since.toISOString().slice(0, 10);
      const res = await this.octokit.rest.search.issuesAndPullRequests({
        q: `repo:${slug} is:pr is:merged merged:>=${sinceStr}`,
        per_page: 100,
      });
      const buckets = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
        buckets.set(new Date(since.getTime() + i * 86400000).toISOString().slice(5, 10), 0);
      }
      for (const item of res.data.items) {
        const key = (item.closed_at ?? "").slice(5, 10);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      return [...buckets.entries()].map(([date, merges]) => ({ date, merges }));
    });
  }

  async getReleaseFrequency(slug: string): Promise<ReleaseFrequencyPoint[]> {
    return this.cached(`rel:${slug}`, async () => {
      const { owner, repo } = parseSlug(slug);
      const releases = await this.octokit
        .paginate(this.octokit.rest.repos.listReleases, { owner, repo, per_page: 100 })
        .catch(() => []);
      const now = Date.now();
      const weeks: ReleaseFrequencyPoint[] = [];
      for (let w = 6; w >= 0; w--) {
        const start = now - (w + 1) * 7 * 86400000;
        const end = now - w * 7 * 86400000;
        const count = releases.filter((r) => {
          const t = new Date(r.published_at ?? r.created_at ?? 0).getTime();
          return t >= start && t < end;
        }).length;
        weeks.push({ period: `W${7 - w}`, count });
      }
      return weeks;
    });
  }

  async getDashboardSummary(slug: string): Promise<DashboardSummary> {
    return this.cached(`sum:${slug}`, async () => {
      const { owner, repo } = parseSlug(slug);
      const [openPrs, releases, runs] = await Promise.all([
        this.octokit.rest.search
          .issuesAndPullRequests({ q: `repo:${slug} is:pr is:open`, per_page: 1 })
          .then((r) => r.data.total_count)
          .catch(() => 0),
        this.octokit.rest.repos.listReleases({ owner, repo, per_page: 100 }).then((r) => r.data).catch(() => []),
        this.octokit.rest.actions
          .listWorkflowRunsForRepo({ owner, repo, per_page: 30 })
          .then((r) => r.data.workflow_runs)
          .catch(() => []),
      ]);
      const latest = releases[0];
      const completed = runs.filter((r) => r.status === "completed");
      const success = completed.filter((r) => r.conclusion === "success").length;
      const envs = await this.getEnvironmentStatuses(slug);
      return {
        activePullRequests: openPrs,
        openReleases: releases.filter((r) => r.draft).length,
        lastDeployment: {
          env: "main",
          ref: latest?.tag_name ?? "main",
          sha: (latest?.tag_name ?? "—").slice(0, 12),
          deployedAt: latest?.published_at ?? new Date(0).toISOString(),
          status: "success",
        },
        repositoryStatus: "operational",
        servicesOnline: envs.filter((e) => e.status === "healthy" || e.status === "stable").length,
        buildHealthPct: completed.length ? Math.round((success / completed.length) * 100) : 100,
      };
    });
  }

  async getEnvironmentStatuses(slug: string): Promise<EnvironmentStatus[]> {
    return this.cached(`env:${slug}`, async () => {
      const { owner, repo } = parseSlug(slug);
      const KNOWN: Record<string, EnvironmentStatus["env"]> = {
        development: "development", dev: "development",
        staging: "staging", stage: "staging",
        production: "main", prod: "main", main: "main",
      };
      const list = await this.octokit.rest.repos
        .getAllEnvironments({ owner, repo })
        .then((r) => r.data.environments ?? [])
        .catch(() => []);
      const out: EnvironmentStatus[] = [];
      for (const e of list) {
        const env = KNOWN[(e.name ?? "").toLowerCase()];
        if (!env || out.some((o) => o.env === env)) continue;
        out.push({
          env,
          status: "stable",
          openPRs: 0,
          lastDeployAt: e.updated_at ?? new Date(0).toISOString(),
          marker: e.name ?? env,
        });
      }
      return out;
    });
  }

  async getDeploymentTimeline(slug: string): Promise<DeploymentTimelinePoint[]> {
    return this.cached(`dep:${slug}`, async () => {
      const { owner, repo } = parseSlug(slug);
      const deps = await this.octokit.rest.repos
        .listDeployments({ owner, repo, per_page: 5 })
        .then((r) => r.data)
        .catch(() => []);
      return deps
        .slice(0, 5)
        .reverse()
        .map((_, i) => ({ day: `D${i + 1}`, status: "success" as const }));
    });
  }
}
