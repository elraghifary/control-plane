import { KineticTextLoader } from "@/components/ui/kinetic-text-loader";
import { cn } from "@/lib/utils";

/** In-content loading state for `loading.tsx` route fallbacks — shell/nav stays visible, only the content area shows this. */
export function PageLoader({ text, className }: { text?: string; className?: string }) {
  return (
    <div className={cn("flex min-h-[50vh] items-center justify-center", className)}>
      <KineticTextLoader text={text} className="scale-[0.6] sm:scale-75" />
    </div>
  );
}
