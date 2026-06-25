import { TopStrip } from "@/components/shell/top-strip";
import { GlassDockNav } from "@/components/shell/glass-dock-nav";
import { GridField } from "@/components/motifs/grid-field";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <GridField />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(820px 320px at 12% -14%, color-mix(in oklab, var(--instrument) 14%, transparent), transparent 60%), radial-gradient(720px 380px at 116% -6%, color-mix(in oklab, var(--instrument-2) 13%, transparent), transparent 55%)" }}
      />
      <div className="relative z-10 mx-auto max-w-[1400px] px-4 pb-28 pt-4">
        <TopStrip />
        <main className="mt-4">{children}</main>
      </div>
      <GlassDockNav />
    </div>
  );
}
