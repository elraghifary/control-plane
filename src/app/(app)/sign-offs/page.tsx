import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDataService } from "@/lib/data/get-data-service";
import { listSignoffPagesAction } from "./actions";
import { CreateSignoffDialog } from "@/components/sign-offs/create-signoff-dialog";
import { SignoffList } from "@/components/sign-offs/signoff-list";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import type { ClickUpSignoffPage } from "@/lib/clickup/types";
import type { Repository } from "@/lib/data/types";

const PAGE_SIZE = 10;

export default async function SignoffsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  let repositories: Repository[] = [];
  let docs: ClickUpSignoffPage[] = [];
  let errorMsg: string | undefined;

  try {
    const data = await getDataService();
    const [repos, docsResult] = await Promise.all([
      data.listRepositories(),
      listSignoffPagesAction(),
    ]);
    repositories = repos;
    if (!docsResult.ok) {
      errorMsg = docsResult.error ?? "Failed to load sign-off documents";
    } else {
      docs = docsResult.pages;
    }
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401) redirect("/login");
    errorMsg = e instanceof Error ? e.message : "Failed to load sign-off documents";
  }

  if (errorMsg) {
    return <ErrorState title="Failed to load sign-offs" description={errorMsg} />;
  }

  const totalPages = Math.max(1, Math.ceil(docs.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageDocs = docs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CreateSignoffDialog repositories={repositories} />
      </div>

      <SignoffList docs={pageDocs} />

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
    </div>
  );
}
