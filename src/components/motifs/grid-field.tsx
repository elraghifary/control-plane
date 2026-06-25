import { cn } from "@/lib/utils";

export function GridField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        backgroundImage:
          "linear-gradient(color-mix(in oklab, var(--foreground) 4%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--foreground) 4%, transparent) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    />
  );
}
