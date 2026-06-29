import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getDataService } from "@/lib/data/get-data-service";
import type { Repository } from "@/lib/data";
import { TopStrip } from "@/components/shell/top-strip";
import { GridField } from "@/components/motifs/grid-field";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const data = await getDataService();
  let repositories: Repository[] = [];
  try {
    repositories = await data.listRepositories();
  } catch (e) {
    if ((e as { status?: number }).status === 401) redirect("/login");
    // Otherwise degrade to an empty selector rather than 500-ing the whole shell.
  }
  const selected = (await cookies()).get("cp-repository")?.value ?? repositories[0]?.slug ?? "";

  return (
    <div className="relative min-h-screen overflow-clip">
      <GridField />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(820px 320px at 12% -14%, color-mix(in oklab, var(--instrument) 14%, transparent), transparent 60%), radial-gradient(720px 380px at 116% -6%, color-mix(in oklab, var(--instrument-2) 13%, transparent), transparent 55%)" }}
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopStrip repositories={repositories} selected={selected} githubLogin={session.user.githubLogin} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-8 pt-20 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
