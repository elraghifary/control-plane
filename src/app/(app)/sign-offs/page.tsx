import { redirect } from "next/navigation";
import { getDataService } from "@/lib/data/get-data-service";
import { listSignoffDocsAction } from "./actions";
import { CreateSignoffDialog } from "@/components/sign-offs/create-signoff-dialog";
import { SignoffList } from "@/components/sign-offs/signoff-list";
import { ErrorState } from "@/components/states/error-state";
import type { ClickUpSignoffDoc } from "@/lib/clickup/types";
import type { Repository } from "@/lib/data/types";

export default async function SignoffsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; history?: string }>;
}) {
  const { cursor, history } = await searchParams;

  let repositories: Repository[] = [];
  let docs: ClickUpSignoffDoc[] = [];
  let nextCursor: string | null = null;
  let errorMsg: string | undefined;

  try {
    const data = await getDataService();
    const [repos, docsResult] = await Promise.all([
      data.listRepositories(),
      listSignoffDocsAction(cursor),
    ]);
    repositories = repos;
    if (!docsResult.ok) {
      errorMsg = docsResult.error ?? "Failed to load sign-off documents";
    } else {
      docs = docsResult.result?.docs ?? [];
      nextCursor = docsResult.result?.nextCursor ?? null;
    }
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401) redirect("/login");
    errorMsg = e instanceof Error ? e.message : "Failed to load sign-off documents";
  }

  if (errorMsg) {
    return <ErrorState title="Failed to load sign-offs" description={errorMsg} />;
  }

  const cursorHistory: string[] = history ? history.split(",").filter(Boolean) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CreateSignoffDialog repositories={repositories} />
      </div>

      <SignoffList docs={docs} nextCursor={nextCursor} cursorHistory={cursorHistory} currentCursor={cursor} />
    </div>
  );
}
