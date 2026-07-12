import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TopStrip } from "@/components/shell/top-strip";
import { GridField } from "@/components/motifs/grid-field";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="relative min-h-screen overflow-clip">
      <GridField />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(820px 320px at 12% -14%, color-mix(in oklab, var(--instrument) 14%, transparent), transparent 60%), radial-gradient(720px 380px at 116% -6%, color-mix(in oklab, var(--instrument-2) 13%, transparent), transparent 55%)" }}
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <TopStrip githubLogin={session.user.githubLogin} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-8 pb-8 pt-20">{children}</main>
      </div>
    </div>
  );
}
