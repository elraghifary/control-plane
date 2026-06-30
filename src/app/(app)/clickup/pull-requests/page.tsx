import { fetchClickUpPage } from "@/lib/clickup/client";
import { getDataService } from "@/lib/data/get-data-service";
import type { PullRequest } from "@/lib/data/types";
import { ClickUpPrList } from "@/components/clickup/clickup-pr-list";
import { ErrorState } from "@/components/states/error-state";

export default async function ClickUpPullRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; history?: string }>;
}) {
  const { cursor, history } = await searchParams;

  try {
    const [clickupPage, data] = await Promise.all([
      fetchClickUpPage(cursor),
      getDataService(),
    ]);

    const results = await Promise.allSettled(
      clickupPage.items.map((item) =>
        data.getPullRequest(`${item.owner}/${item.repo}`, item.prNumber)
      )
    );

    const pullRequests = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((pr): pr is PullRequest => pr !== null);

    const cursorHistory: string[] = history ? history.split(",").filter(Boolean) : [];

    return (
      <ClickUpPrList
        pullRequests={pullRequests}
        nextCursor={clickupPage.nextCursor}
        hasMore={clickupPage.hasMore}
        cursorHistory={cursorHistory}
        currentCursor={cursor}
      />
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return (
      <ErrorState
        title="Couldn't load ClickUp pull requests"
        description={
          msg.includes("Missing")
            ? "ClickUp credentials are not configured."
            : "Failed to fetch from ClickUp API."
        }
      />
    );
  }
}
