import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDataService } from "@/lib/data/get-data-service";
import { ActionsList } from "@/components/actions/actions-list";
import { RepositorySelector } from "@/components/shell/repository-selector";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import type { Repository, WorkflowRunGroup } from "@/lib/data/types";

const PAGE_SIZE = 15;

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const jar = await cookies();
  const cookieSlug = jar.get("cp-repository")?.value;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  let repositories: Repository[] = [];
  let groups: WorkflowRunGroup[] = [];
  let totalCount = 0;
  let selectedSlug = "";
  let errorMsg: string | undefined;

  try {
    const data = await getDataService();
    repositories = await data.listRepositories();
    selectedSlug = repositories.find((r) => r.slug === cookieSlug)?.slug ?? repositories[0]?.slug ?? "";
    if (selectedSlug) {
      const result = await data.listWorkflowRuns(selectedSlug, page);
      groups = result.groups;
      totalCount = result.totalCount;
    }
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401) redirect("/login");
    errorMsg = e instanceof Error ? e.message : "Failed to load workflow runs";
  }

  if (errorMsg) {
    return <ErrorState title="Failed to load Actions" description={errorMsg} />;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="space-y-6">
      <RepositorySelector repositories={repositories} selected={selectedSlug} />

      {!selectedSlug ? (
        <p className="text-sm text-muted-foreground">Select a repository to view workflow runs.</p>
      ) : groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No workflow runs yet.
        </p>
      ) : (
        <>
          <ActionsList slug={selectedSlug} groups={groups} />

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <form method="get">
                <input type="hidden" name="page" value={safePage - 1} />
                <Button type="submit" variant="outline" size="sm" className="gap-1.5" disabled={safePage <= 1}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
              </form>
              <span className="text-xs text-muted-foreground">Page {safePage} of {totalPages}</span>
              <form method="get">
                <input type="hidden" name="page" value={safePage + 1} />
                <Button type="submit" variant="outline" size="sm" className="gap-1.5" disabled={safePage >= totalPages}>
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
