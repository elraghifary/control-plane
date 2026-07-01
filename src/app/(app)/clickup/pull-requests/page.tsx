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

  let pullRequests: PullRequest[] = [];
  let nextCursor: string | null = null;
  let hasMore = false;
  let errorMsg: string | null = null;

  try {
    const [clickupPage, data] = await Promise.all([
      fetchClickUpPage(cursor),
      getDataService(),
    ]);

    nextCursor = clickupPage.nextCursor;
    hasMore = clickupPage.hasMore;

    const results = await Promise.allSettled(
      clickupPage.items.map((item) =>
        data.getPullRequest(`${item.owner}/${item.repo}`, item.prNumber)
      )
    );

    pullRequests = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((pr): pr is PullRequest => pr !== null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    errorMsg = msg.includes("Missing")
      ? "ClickUp credentials are not configured."
      : "Failed to fetch from ClickUp API.";
  }

  if (errorMsg) {
    return <ErrorState title="Couldn't load ClickUp pull requests" description={errorMsg} />;
  }

  const cursorHistory: string[] = history ? history.split(",").filter(Boolean) : [];

  return (
    <ClickUpPrList
      pullRequests={pullRequests}
      nextCursor={nextCursor}
      hasMore={hasMore}
      cursorHistory={cursorHistory}
      currentCursor={cursor}
    />
  );
}
