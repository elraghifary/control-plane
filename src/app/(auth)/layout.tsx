import { GridField } from "@/components/motifs/grid-field";
import { ControlPlaneMark } from "@/components/brand/control-plane-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <GridField />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(700px 360px at 50% -10%, color-mix(in oklab, var(--instrument) 16%, transparent), transparent 60%)" }}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-2">
          <ControlPlaneMark />
          <div className="leading-tight">
            <div className="text-sm font-medium">Control Plane</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
