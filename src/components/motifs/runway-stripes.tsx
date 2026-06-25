import { cn } from "@/lib/utils";

export function RunwayStripes({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-3 w-20 -rotate-[18deg] opacity-50", className)}
      style={{ background: "repeating-linear-gradient(90deg, currentColor 0 10px, transparent 10px 20px)" }}
    />
  );
}
