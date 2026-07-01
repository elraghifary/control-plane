import { fetchClickUpPage } from "@/lib/clickup/client";
import { getDataService } from "@/lib/data/get-data-service";
import { ClickUpPrList, type ClickUpPrEntry } from "@/components/clickup/clickup-pr-list";
import { ErrorState } from "@/components/states/error-state";

export default async function ClickUpPullRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; history?: string }>;
}) {
  const { cursor, history } = await searchParams;

  let items: ClickUpPrEntry[] = [];
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
      clickupPage.items.map(async (item) => ({
        pr: await data.getPullRequest(`${item.owner}/${item.repo}`, item.prNumber),
        clickupAuthor: item.author,
        messageId: item.messageId,
      }))
    );

    items = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((entry): entry is ClickUpPrEntry => entry !== null);
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
      items={items}
      nextCursor={nextCursor}
      hasMore={hasMore}
      cursorHistory={cursorHistory}
      currentCursor={cursor}
    />
  );
}
