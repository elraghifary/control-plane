import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDataService } from "@/lib/data/get-data-service";
import type { PullRequestListState } from "@/lib/data/types";
import { PrList } from "@/components/pull-requests/pr-list";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";

const PER_PAGE = 10;

export default async function PullRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; page?: string }>;
}) {
  const { state: stateParam, page: pageParam } = await searchParams;
  const state: PullRequestListState = stateParam === "closed" ? "closed" : "open";
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const data = await getDataService();

  let empty = false;
  let errorStatus: number | undefined;
  let listProps: React.ComponentProps<typeof PrList> | undefined;

  try {
    const repositories = await data.listRepositories();
    const cookieSlug = (await cookies()).get("cp-repository")?.value;
    const selectedSlug = repositories.find((r) => r.slug === cookieSlug)?.slug ?? repositories[0]?.slug ?? "";
    if (!selectedSlug) {
      empty = true;
    } else {
      const otherState: PullRequestListState = state === "open" ? "closed" : "open";
      const [allPullRequests, otherCount] = await Promise.all([
        data.listPullRequests(undefined, selectedSlug, state),
        data.countPullRequests(undefined, selectedSlug, otherState),
      ]);
      const total = allPullRequests.length;
      const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
      const safePage = Math.min(page, totalPages);
      const pullRequests = allPullRequests.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
      listProps = {
        pullRequests,
        state,
        openCount: state === "open" ? total : otherCount,
        closedCount: state === "closed" ? total : otherCount,
        page: safePage,
        totalPages,
        repositories,
        selectedSlug,
      };
    }
  } catch (e) {
    errorStatus = (e as { status?: number }).status;
    if (errorStatus === 401) redirect("/login");
  }

  if (empty)
    return <EmptyState title="No repository selected" description="Pick a repository from the top bar." />;
  if (!listProps)
    return (
      <ErrorState
        title="Couldn't load pull requests"
        description={errorStatus === 403 ? "GitHub rate limit hit — try again shortly." : "The GitHub API request failed."}
      />
    );
  return <PrList {...listProps} />;
}
