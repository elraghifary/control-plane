import { Octokit } from "octokit";
import type { DataService, PullRequestReviewEvent } from "./data-service";
import type {
  Repository, DashboardSummary, EnvironmentStatus,
  MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint,
  PullRequest, PullRequestReviewState, PullRequestReviewer, PullRequestStatus, StagingSyncResult, StagingCreateResult, StagingPrepareResult,
  PullRequestListState, PullRequestFileChange, Release, PublishReleaseResult,
} from "./types";

function parseSlug(slug: string): { owner: string; repo: string } {
  const [owner, repo] = slug.split("/");
  return { owner, repo };
}

const STAGING_BODY = "📦 Sync Development to Staging\n\nThis PR merges the development branch into staging.";

function mapReviewState(gh: string): PullRequestReviewState {
  if (gh === "APPROVED") return "approved";
  if (gh === "CHANGES_REQUESTED") return "changes_requested";
  if (gh === "COMMENTED") return "commented";
  return "pending";
}

function aggregateReviewStatus(reviewers: PullRequestReviewer[], draft: boolean): PullRequestReviewState {
  if (draft) return "pending";
  if (reviewers.some((r) => r.state === "changes_requested")) return "changes_requested";
  if (reviewers.some((r) => r.state === "approved")) return "approved";
  return "pending";
}

function prStatus(draft: boolean, merged: boolean, state: string): PullRequestStatus {
  if (merged) return "merged";
  if (draft) return "draft";
  if (state === "closed") return "closed";
  return "open";
}

export class OctokitDataService implements DataService {
  private octokit: Octokit;
  private orgs: string[];
  private cache = new Map<string, { at: number; value: Promise<unknown> }>();
  private ttl = 60_000;

  constructor(pat: string, orgs: string[] = []) {
    this.octokit = new Octokit({ auth: pat });
    this.orgs = orgs;
  }

  // Cache the in-flight promise so concurrent callers coalesce into one request;
  // evict on rejection so a failed call isn't cached.
  private cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.ttl) return hit.value as Promise<T>;
    const value = fn();
    this.cache.set(key, { at: Date.now(), value });
    value.catch(() => this.cache.delete(key));
    return value;
  }

  async listRepositories(): Promise<Repository[]> {
    return this.cached("repositories", async () => {
      if (this.orgs.length === 0) return [];
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
      for (const r of orgRepos) {
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
      const now = new Date();
      const daysSinceWed = (now.getUTCDay() - 3 + 7) % 7;
      const wedMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceWed);
      const since = new Date(wedMs);
      const sinceStr = since.toISOString().slice(0, 10);
      const res = await this.octokit.rest.search.issuesAndPullRequests({
        q: `repo:${slug} is:pr is:merged merged:>=${sinceStr}`,
        per_page: 100,
      });
      const buckets = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        buckets.set(new Date(wedMs + i * 86400000).toISOString().slice(0, 10), 0);
      }
      for (const item of res.data.items) {
        const key = (item.closed_at ?? "").slice(0, 10);
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
      const [openPrs, releases] = await Promise.all([
        this.octokit.rest.search
          .issuesAndPullRequests({ q: `repo:${slug} is:pr is:open`, per_page: 1 })
          .then((r) => r.data.total_count)
          .catch(() => 0),
        this.octokit.rest.repos.listReleases({ owner, repo, per_page: 100 }).then((r) => r.data).catch(() => []),
      ]);
      const published = releases.filter((r) => !r.draft);
      const latest = published[0];
      const envs = await this.getEnvironmentStatuses(slug);
      return {
        activePullRequests: openPrs,
        totalReleases: published.length,
        lastDeployment: {
          env: "main",
          ref: latest?.tag_name ?? "—",
          sha: (latest?.tag_name ?? "—").slice(0, 12),
          deployedAt: latest?.published_at ?? new Date(0).toISOString(),
          status: "success",
        },
        servicesOnline: envs.filter((e) => e.status === "healthy" || e.status === "stable").length,
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

  private async fetchPullRequest(slug: string, number: number, skipReviews = false): Promise<PullRequest> {
    const { owner, repo } = parseSlug(slug);
    const [detail, reviews] = await Promise.all([
      this.octokit.rest.pulls.get({ owner, repo, pull_number: number }),
      skipReviews
        ? Promise.resolve({ data: [] as { user: { login: string; avatar_url: string } | null; state: string }[] })
        : this.octokit.rest.pulls.listReviews({ owner, repo, pull_number: number }).catch(() => ({ data: [] })),
    ]);
    const pr = detail.data;
    const reviewerMap = new Map<string, PullRequestReviewer>();
    for (const u of pr.requested_reviewers ?? []) {
      if (u.login) reviewerMap.set(u.login, { login: u.login, avatarUrl: u.avatar_url ?? undefined, state: "pending" });
    }
    for (const review of reviews.data) {
      if (review.user?.login) {
        reviewerMap.set(review.user.login, {
          login: review.user.login,
          avatarUrl: review.user.avatar_url ?? undefined,
          state: mapReviewState(review.state),
        });
      }
    }
    const reviewers = [...reviewerMap.values()];
    const draft = pr.draft ?? false;
    const merged = Boolean(pr.merged_at);
    return {
      id: pr.id,
      number: pr.number,
      slug,
      title: pr.title,
      author: pr.user?.login ?? "unknown",
      authorAvatarUrl: pr.user?.avatar_url ?? undefined,
      sourceBranch: pr.head.ref,
      destinationBranch: pr.base.ref,
      createdAt: pr.created_at,
      status: prStatus(draft, merged, pr.state),
      mergeable: pr.mergeable ?? false,
      reviewers,
      labels: (pr.labels ?? []).map((l) => ({ name: l.name ?? "", color: l.color ?? "888888" })),
      commitCount: pr.commits ?? 0,
      filesChanged: pr.changed_files ?? 0,
      reviewStatus: aggregateReviewStatus(reviewers, draft),
      body: pr.body ?? "",
      htmlUrl: pr.html_url,
    };
  }

  private invalidatePullRequestCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith("prs:") || key.startsWith("prs-count:")) this.cache.delete(key);
    }
  }

  private invalidateReleaseCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith("releases:") || key.startsWith("rel:") || key.startsWith("sum:")) this.cache.delete(key);
    }
  }

  async countPullRequests(targetBranch: string | undefined, repositorySlug: string, state: PullRequestListState): Promise<number> {
    if (!repositorySlug) return 0;
    return this.cached(`prs-count:${targetBranch ?? "all"}:${repositorySlug}:${state}`, async () => {
      const ghState = state === "open" ? "is:open" : "is:closed";
      const baseFilter = targetBranch ? ` base:${targetBranch}` : "";
      const res = await this.octokit.rest.search
        .issuesAndPullRequests({ q: `repo:${repositorySlug} is:pr${baseFilter} ${ghState}`, per_page: 1 })
        .catch(() => ({ data: { total_count: 0 } }));
      return res.data.total_count;
    });
  }

  async listPullRequests(targetBranch: string | undefined, repositorySlug: string, state: PullRequestListState = "open"): Promise<PullRequest[]> {
    if (!repositorySlug) return [];
    return this.cached(`prs:${targetBranch ?? "all"}:${repositorySlug}:${state}`, async () => {
      const { owner, repo } = parseSlug(repositorySlug);
      try {
        const pulls = await this.octokit.paginate(this.octokit.rest.pulls.list, {
          owner, repo, ...(targetBranch ? { base: targetBranch } : {}), state, per_page: 100,
        });

        if (state === "closed") {
          // Closed PRs aren't actionable — map from list data directly (no per-PR API calls).
          // commits/filesChanged are not in the list endpoint; acceptable for closed view.
          return pulls
            .map((p) => {
              const draft = p.draft ?? false;
              const merged = Boolean(p.merged_at);
              const reviewers: PullRequestReviewer[] = (p.requested_reviewers ?? []).map((u) => ({
                login: u.login ?? "",
                avatarUrl: u.avatar_url ?? undefined,
                state: "pending" as PullRequestReviewState,
              }));
              return {
                id: p.id,
                number: p.number,
                slug: repositorySlug,
                title: p.title,
                author: p.user?.login ?? "unknown",
                authorAvatarUrl: p.user?.avatar_url ?? undefined,
                sourceBranch: p.head.ref,
                destinationBranch: p.base.ref,
                createdAt: p.created_at,
                status: prStatus(draft, merged, p.state),
                mergeable: false,
                reviewers,
                labels: (p.labels ?? []).map((l) => ({ name: l.name ?? "", color: l.color ?? "888888" })),
                commitCount: 0,
                filesChanged: 0,
                reviewStatus: aggregateReviewStatus(reviewers, draft),
                body: p.body ?? "",
                htmlUrl: p.html_url,
              };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        // Open PRs: fetch detail + skip reviews for draft PRs (drafts can't be reviewed/merged).
        const prs = await Promise.all(
          pulls.map((p) => this.fetchPullRequest(repositorySlug, p.number, p.draft ?? false))
        );
        return prs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch {
        return [];
      }
    });
  }

  async getPullRequestFiles(slug: string, number: number): Promise<PullRequestFileChange[]> {
    const { owner, repo } = parseSlug(slug);
    const files = await this.octokit.paginate(this.octokit.rest.pulls.listFiles, {
      owner, repo, pull_number: number, per_page: 100,
    });
    return files.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
      previousFilename: f.previous_filename ?? undefined,
    }));
  }

  async getPullRequest(slug: string, number: number): Promise<PullRequest> {
    return this.fetchPullRequest(slug, number);
  }

  async submitPullRequestReview(slug: string, number: number, event: PullRequestReviewEvent, body?: string): Promise<void> {
    const { owner, repo } = parseSlug(slug);
    await this.octokit.rest.pulls.createReview({
      owner, repo, pull_number: number, event, body: body || undefined,
    });
    this.invalidatePullRequestCache();
  }

  async mergePullRequest(slug: string, number: number): Promise<void> {
    const { owner, repo } = parseSlug(slug);
    await this.octokit.rest.pulls.merge({ owner, repo, pull_number: number });
    this.invalidatePullRequestCache();
  }

  async closePullRequest(slug: string, number: number): Promise<void> {
    const { owner, repo } = parseSlug(slug);
    await this.octokit.rest.pulls.update({ owner, repo, pull_number: number, state: "closed" });
    this.invalidatePullRequestCache();
  }

  async reopenPullRequest(slug: string, number: number): Promise<void> {
    const { owner, repo } = parseSlug(slug);
    await this.octokit.rest.pulls.update({ owner, repo, pull_number: number, state: "open" });
    this.invalidatePullRequestCache();
  }

  async prepareStagingPR(slug: string): Promise<StagingPrepareResult> {
    const { owner, repo } = parseSlug(slug);
    try {
      const open = await this.octokit.rest.pulls.list({ owner, repo, state: "open", base: "staging", per_page: 100 });
      const existing = open.data.find((p) => p.head.ref === "development" && p.base.ref === "staging");
      if (existing) {
        return { slug, created: false, prNumber: existing.number, prUrl: existing.html_url };
      }
      const newPr = await this.octokit.rest.pulls.create({
        owner, repo,
        title: "Sync Development to Staging",
        head: "development",
        base: "staging",
        body: STAGING_BODY,
      });
      return { slug, created: true, prNumber: newPr.data.number, prUrl: newPr.data.html_url };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/no commits between/i.test(msg)) return { slug, alreadySynced: true };
      return { slug, error: msg || "Failed to create pull request" };
    }
  }

  async createStagingPR(slug: string): Promise<StagingCreateResult> {
    const { owner, repo } = parseSlug(slug);
    try {
      const open = await this.octokit.rest.pulls.list({ owner, repo, state: "open", base: "staging", per_page: 100 });
      const existing = open.data.find((p) => p.head.ref === "development" && p.base.ref === "staging");
      let prNumber: number;
      let prUrl: string;
      let created: boolean;
      if (existing) {
        prNumber = existing.number;
        prUrl = existing.html_url;
        created = false;
      } else {
        const newPr = await this.octokit.rest.pulls.create({
          owner, repo,
          title: "Sync Development to Staging",
          head: "development",
          base: "staging",
          body: STAGING_BODY,
        });
        prNumber = newPr.data.number;
        prUrl = newPr.data.html_url;
        created = true;
      }
      await this.octokit.rest.pulls.merge({ owner, repo, pull_number: prNumber });
      this.invalidatePullRequestCache();
      return { slug, created, merged: true, prUrl };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/no commits between/i.test(msg)) return { slug, created: false, merged: false, alreadySynced: true };
      return { slug, created: false, merged: false, error: msg || "Failed to create pull request" };
    }
  }

  async createAndMergeStagingPR(slug: string): Promise<StagingSyncResult> {
    const { owner, repo } = parseSlug(slug);
    try {
      const open = await this.octokit.rest.pulls.list({ owner, repo, state: "open", base: "staging", per_page: 100 });
      let prNumber = open.data.find((p) => p.base.ref === "staging" && p.head.ref === "development")?.number;
      if (!prNumber) {
        const created = await this.octokit.rest.pulls.create({
          owner, repo, title: "Sync Development to Staging", head: "development", base: "staging", body: STAGING_BODY,
        });
        prNumber = created.data.number;
      }
      await this.octokit.rest.pulls.merge({ owner, repo, pull_number: prNumber });
      this.invalidatePullRequestCache();
      return { slug, ok: true, prNumber };
    } catch (e) {
      return { slug, ok: false, error: e instanceof Error ? e.message : "Staging sync failed" };
    }
  }

  async listBranches(slug: string): Promise<string[]> {
    return this.cached(`branches:${slug}`, async () => {
      const { owner, repo } = parseSlug(slug);
      const branches = await this.octokit
        .paginate(this.octokit.rest.repos.listBranches, { owner, repo, per_page: 100 })
        .catch(() => []);
      return branches.map((b) => b.name);
    });
  }

  async listReleases(slug: string): Promise<Release[]> {
    return this.cached(`releases:${slug}`, async () => {
      const { owner, repo } = parseSlug(slug);
      const data = await this.octokit
        .paginate(this.octokit.rest.repos.listReleases, { owner, repo, per_page: 100 })
        .catch(() => []);
      const published = data.filter((r) => !r.draft);
      return published.map((r, i) => ({
        id: r.id,
        slug,
        tagName: r.tag_name,
        name: r.name ?? r.tag_name,
        body: r.body ?? "",
        isLatest: i === 0 && !r.prerelease,
        isDraft: r.draft,
        isPrerelease: r.prerelease,
        targetBranch: r.target_commitish,
        publishedAt: r.published_at ?? null,
        createdAt: r.created_at,
        htmlUrl: r.html_url,
        author: r.author?.login ?? "unknown",
      }));
    });
  }

  async generateReleaseNotes(slug: string, tagName: string, targetBranch: string, previousTag?: string): Promise<string> {
    const { owner, repo } = parseSlug(slug);
    try {
      const res = await this.octokit.rest.repos.generateReleaseNotes({
        owner,
        repo,
        tag_name: tagName,
        target_commitish: targetBranch,
        ...(previousTag ? { previous_tag_name: previousTag } : {}),
      });
      return res.data.body;
    } catch {
      return "";
    }
  }

  async publishRelease(slug: string, tagName: string, targetBranch: string, body: string): Promise<PublishReleaseResult> {
    const { owner, repo } = parseSlug(slug);
    const res = await this.octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tagName,
      name: tagName,
      target_commitish: targetBranch,
      body,
      draft: false,
      prerelease: false,
      make_latest: "true",
    });
    this.invalidateReleaseCache();
    return { tagName, htmlUrl: res.data.html_url };
  }
}
