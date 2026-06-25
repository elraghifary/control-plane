import type { DataService } from "./data-service";
import { REPOS } from "./fixtures/repos";
import { summaryFor, envStatusesFor, mergeActivityFor, releaseFrequencyFor, deploymentTimelineFor } from "./fixtures/dashboard";

export class MockDataService implements DataService {
  async listRepositories() { return [...REPOS]; }
  async getDashboardSummary(slug: string) { return summaryFor(slug); }
  async getEnvironmentStatuses(slug: string) { return envStatusesFor(slug); }
  async getMergeActivity(slug: string) { return mergeActivityFor(slug); }
  async getReleaseFrequency(slug: string) { return releaseFrequencyFor(slug); }
  async getDeploymentTimeline(slug: string) { return deploymentTimelineFor(slug); }
}
