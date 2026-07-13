import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDataService } from "@/lib/data/get-data-service";
import { PublishReleaseDialog } from "@/components/releases/publish-release-dialog";
import { ReleaseProductionDialog } from "@/components/releases/release-production-dialog";
import { ReleaseCard } from "@/components/releases/release-card";
import { RepositorySelector } from "@/components/shell/repository-selector";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import type { Release, Repository } from "@/lib/data/types";

const PAGE_SIZE = 10;

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const jar = await cookies();
  const cookieSlug = jar.get("cp-repository")?.value;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  let repositories: Repository[] = [];
  let releases: Release[] = [];
  let selectedSlug = "";
  let errorMsg: string | undefined;

  try {
    const data = await getDataService();
    repositories = await data.listRepositories();
    selectedSlug = repositories.find((r) => r.slug === cookieSlug)?.slug ?? repositories[0]?.slug ?? "";
    if (selectedSlug) {
      releases = await data.listReleases(selectedSlug);
    }
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401) redirect("/login");
    errorMsg = e instanceof Error ? e.message : "Failed to load releases";
  }

  if (errorMsg) {
    return <ErrorState title="Failed to load releases" description={errorMsg} />;
  }

  const totalPages = Math.max(1, Math.ceil(releases.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageReleases = releases.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const latestTag = releases.find((r) => r.isLatest)?.tagName ?? releases[0]?.tagName ?? null;
  const defaultBranch = releases[0]?.targetBranch ?? "main";
  const repoName = repositories.find((r) => r.slug === selectedSlug)?.name ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <RepositorySelector repositories={repositories} selected={selectedSlug} />
        <div className="flex gap-2">
          {selectedSlug && (
            <>
              <PublishReleaseDialog
                repositories={repositories}
                slug={selectedSlug}
                latestTag={latestTag}
                defaultBranch={defaultBranch}
              />
              <ReleaseProductionDialog
                repositories={repositories}
                slug={selectedSlug}
                repoName={repoName}
                tags={releases.map((r) => r.tagName)}
              />
            </>
          )}
        </div>
      </div>

      {!selectedSlug ? (
        <p className="text-sm text-muted-foreground">Select a repository to view releases.</p>
      ) : releases.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No releases yet. Publish the first one.
        </p>
      ) : (
        <>
          <div className="space-y-4">
            {pageReleases.map((r) => (
              <ReleaseCard key={r.id} release={r} />
            ))}
          </div>

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
