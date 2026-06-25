# Control Plane — Phase 1 (Foundations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Control Plane app shell (glass-dock nav + floating top strip), the aviation/HUD design system, and a Dashboard rendered from mock data — dark-first with a light toggle.

**Architecture:** Next.js App Router with an `(app)` route group whose layout renders a floating glass dock + top strip around full-bleed pages. A typed `DataService` interface is backed by a `MockDataService` (in-repo fixtures) so a real Octokit implementation can be swapped in one line later. Theme via next-themes; selected repository via a persisted Zustand store. Charts via Recharts (SVG fallback documented).

**Tech Stack:** Next 16.2.9, React 19.2.4, TypeScript 5, Tailwind v4, framer-motion, next-themes, zustand, recharts, sonner, lucide-react, VengeanceUI components (`glass-dock`, `animated-number`, `glow-border-card`).

## Global Constraints

- Verification per task: `npx tsc --noEmit` clean AND (where UI changed) `npm run dev` visual check. No unit-test framework (chosen). Run `npx next build` at Tasks 11 and 12.
- Keep the neutral shadcn tokens in `src/app/globals.css` **unchanged**; only ADD new accent/status variables.
- Accent = cyan "instrument"; status = green/amber/red. Reference via Tailwind tokens (`text-instrument`, `bg-status-healthy`, …), never hardcoded hex in components.
- Dark is the default theme; every component must remain readable in light mode (use semantic tokens, not raw white-alpha).
- Respect `prefers-reduced-motion` for all looping/entrance animations.
- This is the modified Next 16. Before using `template.tsx`, `redirect`, or instant navigation, confirm conventions in `node_modules/next/dist/docs/01-app/01-getting-started/` (`03-layouts-and-pages.md`, `05-server-and-client-components.md`) and `02-guides/instant-navigation.mdx`.
- Commit after every task. Branch: `control-plane-foundations` (already checked out).

---

### Task 1: Foundations — deps, theme tokens, providers, root layout

**Files:**
- Modify: `package.json` (add deps)
- Modify: `src/app/globals.css` (add accent/status tokens + @theme mappings)
- Create: `src/app/providers.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx` (redirect to /dashboard)

**Interfaces:**
- Produces: `Providers` (wraps app in `next-themes` + Sonner `Toaster`); Tailwind tokens `instrument`, `instrument-2`, `status-healthy`, `status-warn`, `status-error`.

- [ ] **Step 1: Install dependencies**

Run: `yarn add zustand recharts sonner`
Expected: all three resolve and install (yarn 1.x).

- [ ] **Step 2: Add accent/status tokens to `globals.css`**

Inside the existing `@theme inline { … }` block, add these mappings (do not remove anything):

```css
  --color-instrument: var(--instrument);
  --color-instrument-2: var(--instrument-2);
  --color-status-healthy: var(--status-healthy);
  --color-status-warn: var(--status-warn);
  --color-status-error: var(--status-error);
```

In the `:root { … }` block (light mode) add:

```css
  --instrument: oklch(0.62 0.12 233);
  --instrument-2: oklch(0.55 0.18 277);
  --status-healthy: oklch(0.62 0.13 165);
  --status-warn: oklch(0.70 0.15 80);
  --status-error: oklch(0.60 0.19 22);
```

In the `.dark { … }` block add (matches the approved mockup hexes):

```css
  --instrument: oklch(0.746 0.123 233);   /* ~#38bdf8 */
  --instrument-2: oklch(0.60 0.20 277);   /* ~#6366f1 */
  --status-healthy: oklch(0.78 0.14 165); /* ~#34d399 */
  --status-warn: oklch(0.83 0.16 85);     /* ~#fbbf24 */
  --status-error: oklch(0.71 0.17 18);    /* ~#f87171 */
```

- [ ] **Step 3: Create `src/app/providers.tsx`**

```tsx
"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      {children}
      <Toaster position="top-right" theme="dark" richColors closeButton />
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Wrap the root layout**

Edit `src/app/layout.tsx` so `<html>` has `suppressHydrationWarning` (next-themes requirement) and the body wraps children in `Providers`:

```tsx
import { Providers } from "./providers";
// ...existing font + metadata imports stay...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Redirect root to dashboard**

Replace `src/app/page.tsx` contents:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` → Expected: no errors.
Run: `npm run dev`, open `/` → Expected: redirects to `/dashboard` (404 page is fine for now; no console errors about theme/hydration).

- [ ] **Step 7: Commit**

```bash
git add package.json yarn.lock src/app/globals.css src/app/providers.tsx src/app/layout.tsx src/app/page.tsx
git commit -m "feat(foundations): add deps, accent/status tokens, theme + toast providers"
```

---

### Task 2: Aviation motif primitives + brand mark

**Files:**
- Create: `src/components/motifs/radar-rings.tsx`
- Create: `src/components/motifs/runway-stripes.tsx`
- Create: `src/components/motifs/hud-corners.tsx`
- Create: `src/components/motifs/grid-field.tsx`
- Create: `src/components/brand/control-plane-mark.tsx`

**Interfaces:**
- Produces: `RadarRings({size?, className?, sweep?})`, `RunwayStripes({className?})`, `HudCorners({className?})`, `GridField({className?})`, `ControlPlaneMark({size?, className?})`. All presentational; color via `currentColor`/tokens.

- [ ] **Step 1: `radar-rings.tsx`**

```tsx
"use client";
import { cn } from "@/lib/utils";

export function RadarRings({ size = 64, className, sweep = true }: { size?: number; className?: string; sweep?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={cn("text-instrument", className)} aria-hidden="true">
      <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <circle cx="40" cy="40" r="19" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {sweep && (
        <g className="origin-center motion-reduce:hidden [animation:cp-sweep_4s_linear_infinite]" style={{ transformOrigin: "40px 40px" }}>
          <path d="M40 40 L40 8 A32 32 0 0 1 64 22 Z" fill="currentColor" opacity="0.2" />
        </g>
      )}
      <circle cx="40" cy="40" r="2.5" fill="currentColor" />
    </svg>
  );
}
```

Add the keyframes to `globals.css` (after the `@layer base` block):

```css
@keyframes cp-sweep { to { transform: rotate(360deg); } }
@keyframes cp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes cp-shimmer { 100% { transform: translateX(100%); } }
```

- [ ] **Step 2: `runway-stripes.tsx`**

```tsx
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
```

- [ ] **Step 3: `hud-corners.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function HudCorners({ className }: { className?: string }) {
  const corner = "absolute w-3 h-3 border-instrument/40";
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={cn(corner, "left-0 top-0 border-l border-t rounded-tl")} />
      <span className={cn(corner, "right-0 top-0 border-r border-t rounded-tr")} />
      <span className={cn(corner, "bottom-0 left-0 border-b border-l rounded-bl")} />
      <span className={cn(corner, "bottom-0 right-0 border-b border-r rounded-br")} />
    </div>
  );
}
```

- [ ] **Step 4: `grid-field.tsx`**

```tsx
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
```

- [ ] **Step 5: `control-plane-mark.tsx`** (radar/tower brand mark)

```tsx
import { cn } from "@/lib/utils";

export function ControlPlaneMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={cn("text-instrument", className)} aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="20" cy="20" r="3.2" fill="currentColor" />
      <g className="motion-reduce:hidden [animation:cp-sweep_4s_linear_infinite]" style={{ transformOrigin: "20px 20px" }}>
        <path d="M20 20 L20 3 A17 17 0 0 1 33 11 Z" fill="currentColor" opacity="0.2" />
      </g>
    </svg>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit` → Expected: no errors. (Visual confirmation happens when these appear on the dashboard in Task 12.)

- [ ] **Step 7: Commit**

```bash
git add src/components/motifs src/components/brand src/app/globals.css
git commit -m "feat(design-system): aviation motif primitives + brand mark"
```

---

### Task 3: Motion primitives

**Files:**
- Create: `src/components/motion/page-transition.tsx`
- Create: `src/components/motion/fade-in.tsx` (exports `FadeInUp`, `Stagger`)
- Create: `src/components/motion/animated-counter.tsx`

**Interfaces:**
- Produces: `PageTransition({children})`, `FadeInUp({children, delay?, className?})`, `Stagger({children, className?})`, `AnimatedCounter({value, className?, suffix?})`.

- [ ] **Step 1: `page-transition.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: `fade-in.tsx`**

```tsx
"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function FadeInUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: `animated-counter.tsx`** (count-up; respects reduced motion)

```tsx
"use client";
import * as React from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export function AnimatedCounter({ value, className, suffix }: { value: number; className?: string; suffix?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: 1200, bounce: 0 });
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  React.useEffect(() => spring.on("change", (v) => setDisplay(Math.round(v))), [spring]);

  return (
    <span ref={ref} className={cn("font-mono tabular-nums", className)}>
      {display.toLocaleString()}{suffix}
    </span>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/motion
git commit -m "feat(design-system): motion primitives (transition, fade, stagger, counter)"
```

---

### Task 4: Data layer — types, service interface, fixtures, mock service

**Files:**
- Create: `src/lib/data/types.ts`
- Create: `src/lib/data/data-service.ts`
- Create: `src/lib/data/fixtures/repos.ts`
- Create: `src/lib/data/fixtures/dashboard.ts`
- Create: `src/lib/data/mock-data-service.ts`
- Create: `src/lib/data/index.ts`

**Interfaces:**
- Produces: all domain types (section 6 of spec), `DataService` interface, `REPOS: Repository[]`, and `data: DataService` (a `MockDataService` instance).

- [ ] **Step 1: `types.ts`** (copy verbatim from spec §6)

```ts
export type EnvName = "development" | "staging" | "main";

export interface Repository { id: string; name: string; slug: string; enabled: boolean; defaultBranch: string; }
export interface Deployment { env: EnvName; ref: string; sha: string; deployedAt: string; status: "success" | "in_progress" | "failed"; }
export interface DashboardSummary {
  activePullRequests: number;
  openReleases: number;
  lastDeployment: Deployment;
  repositoryStatus: "operational" | "degraded" | "down";
  servicesOnline: number;
  buildHealthPct: number;
}
export interface EnvironmentStatus {
  env: EnvName;
  status: "healthy" | "deploying" | "stable" | "degraded";
  openPRs: number;
  lastDeployAt: string;
  marker: string;
  progressPct?: number;
}
export interface MergeActivityPoint { date: string; merges: number; }
export interface ReleaseFrequencyPoint { period: string; count: number; }
export interface DeploymentTimelinePoint { day: string; status: "success" | "in_progress" | "failed"; }
```

- [ ] **Step 2: `data-service.ts`**

```ts
import type { Repository, DashboardSummary, EnvironmentStatus, MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint } from "./types";

export interface DataService {
  listRepositories(): Promise<Repository[]>;
  getDashboardSummary(repoSlug: string): Promise<DashboardSummary>;
  getEnvironmentStatuses(repoSlug: string): Promise<EnvironmentStatus[]>;
  getMergeActivity(repoSlug: string): Promise<MergeActivityPoint[]>;
  getReleaseFrequency(repoSlug: string): Promise<ReleaseFrequencyPoint[]>;
  getDeploymentTimeline(repoSlug: string): Promise<DeploymentTimelinePoint[]>;
}
```

- [ ] **Step 3: `fixtures/repos.ts`**

```ts
import type { Repository } from "../types";

export const REPOS: Repository[] = [
  { id: "1", name: "dashboard", slug: "dashboard", enabled: true, defaultBranch: "main" },
  { id: "2", name: "api", slug: "api", enabled: true, defaultBranch: "main" },
  { id: "3", name: "payment", slug: "payment", enabled: true, defaultBranch: "main" },
  { id: "4", name: "notification", slug: "notification", enabled: true, defaultBranch: "main" },
  { id: "5", name: "users", slug: "users", enabled: true, defaultBranch: "main" },
  { id: "6", name: "inventory", slug: "inventory", enabled: false, defaultBranch: "main" },
];
```

- [ ] **Step 4: `fixtures/dashboard.ts`** (deterministic per-repo mock; seeded by slug length so each repo differs)

```ts
import type { DashboardSummary, EnvironmentStatus, MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint } from "../types";

const seed = (slug: string) => (slug.length * 7) % 9;

export function summaryFor(slug: string): DashboardSummary {
  const s = seed(slug);
  return {
    activePullRequests: 8 + s,
    openReleases: 2 + (s % 4),
    lastDeployment: { env: "main", ref: "main", sha: "a1b2c3d", deployedAt: new Date(0).toISOString(), status: "success" },
    repositoryStatus: s % 5 === 0 ? "degraded" : "operational",
    servicesOnline: 6,
    buildHealthPct: 90 + (s % 10),
  };
}

export function envStatusesFor(slug: string): EnvironmentStatus[] {
  const s = seed(slug);
  return [
    { env: "development", status: "healthy", openPRs: 4 + (s % 5), lastDeployAt: new Date(0).toISOString(), marker: "3e9f1a" },
    { env: "staging", status: "deploying", openPRs: 1 + (s % 3), lastDeployAt: new Date(0).toISOString(), marker: "7c2d40", progressPct: 61 },
    { env: "main", status: "stable", openPRs: 0, lastDeployAt: new Date(0).toISOString(), marker: "v2.4.1" },
  ];
}

export function mergeActivityFor(slug: string): MergeActivityPoint[] {
  const s = seed(slug);
  return Array.from({ length: 14 }, (_, i) => ({ date: `D${i + 1}`, merges: Math.max(0, Math.round(3 + Math.sin(i / 2 + s) * 3 + i / 4)) }));
}

export function releaseFrequencyFor(slug: string): ReleaseFrequencyPoint[] {
  const s = seed(slug);
  return Array.from({ length: 7 }, (_, i) => ({ period: `W${i + 1}`, count: Math.max(0, Math.round(2 + Math.cos(i + s) * 2 + i / 3)) }));
}

export function deploymentTimelineFor(slug: string): DeploymentTimelinePoint[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const s = seed(slug);
  return days.map((day, i) => ({ day, status: (i + s) % 4 === 0 ? "in_progress" : "success" }));
}
```

- [ ] **Step 5: `mock-data-service.ts`**

```ts
import type { DataService } from "./data-service";
import { REPOS } from "./fixtures/repos";
import { summaryFor, envStatusesFor, mergeActivityFor, releaseFrequencyFor, deploymentTimelineFor } from "./fixtures/dashboard";

export class MockDataService implements DataService {
  async listRepositories() { return REPOS; }
  async getDashboardSummary(slug: string) { return summaryFor(slug); }
  async getEnvironmentStatuses(slug: string) { return envStatusesFor(slug); }
  async getMergeActivity(slug: string) { return mergeActivityFor(slug); }
  async getReleaseFrequency(slug: string) { return releaseFrequencyFor(slug); }
  async getDeploymentTimeline(slug: string) { return deploymentTimelineFor(slug); }
}
```

- [ ] **Step 6: `index.ts`** (the single swap point)

```ts
import { MockDataService } from "./mock-data-service";
import type { DataService } from "./data-service";

export const data: DataService = new MockDataService();
export * from "./types";
export { REPOS } from "./fixtures/repos";
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/data
git commit -m "feat(data): DataService interface + MockDataService with fixtures"
```

---

### Task 5: Repository store (Zustand, persisted)

**Files:**
- Create: `src/lib/store/use-repo-store.ts`

**Interfaces:**
- Consumes: `REPOS` from `@/lib/data`.
- Produces: `useRepoStore()` → `{ selectedRepo: string; setSelectedRepo: (slug: string) => void }`.

- [ ] **Step 1: Write the store**

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RepoState {
  selectedRepo: string;
  setSelectedRepo: (slug: string) => void;
}

export const useRepoStore = create<RepoState>()(
  persist(
    (set) => ({
      selectedRepo: "dashboard",
      setSelectedRepo: (slug) => set({ selectedRepo: slug }),
    }),
    { name: "cp-selected-repo" }
  )
);
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/store
git commit -m "feat(state): persisted selected-repository store"
```

---

### Task 6: Extend `glass-dock` with an `activeIndex` prop

**Files:**
- Modify: `src/components/ui/glass-dock.tsx`

**Interfaces:**
- Produces: `GlassDockProps` gains `activeIndex?: number`; the item at that index renders a persistent cyan "active" treatment (independent of hover).

- [ ] **Step 1: Add the prop to the interface**

In `GlassDockProps` (after `dockClassName?: string;`) add:

```tsx
    activeIndex?: number;
```

- [ ] **Step 2: Destructure it**

In the `forwardRef` arg list, add `activeIndex` alongside `items, className, dockClassName`.

- [ ] **Step 3: Apply active styling on the item wrapper**

In the `items.map(...)` callback, change the line `const isActive = isHovered;` to:

```tsx
const isActive = activeIndex === index;
```

Then on the item's outer `<div ... className="relative w-10 h-10 flex items-center justify-center cursor-pointer">`, append an active treatment:

```tsx
className={cn(
  "relative w-10 h-10 flex items-center justify-center cursor-pointer rounded-xl transition-colors",
  isActive && "bg-instrument/15 ring-1 ring-instrument/50"
)}
```

And for the non-animated `<Icon>` color, make active use the instrument color:

```tsx
className={cn(
  "h-[22px] w-[22px] transition-colors duration-200",
  isActive ? "text-instrument" : isHovered ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
)}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/glass-dock.tsx
git commit -m "feat(dock): add activeIndex prop for persistent active state"
```

---

### Task 7: Shell — RepoSelector, TopStrip, GlassDockNav

**Files:**
- Create: `src/components/shell/repo-selector.tsx`
- Create: `src/components/shell/top-strip.tsx`
- Create: `src/components/shell/glass-dock-nav.tsx`

**Interfaces:**
- Consumes: `useRepoStore`, `REPOS`, `GlassDock`, `ControlPlaneMark`, `ThemeToggle`, `useOutsideClick`, `usePathname`/`useRouter`.
- Produces: `RepoSelector()`, `TopStrip()`, `GlassDockNav()`.

- [ ] **Step 1: `repo-selector.tsx`** (custom dropdown; reuses our `use-outside-click` hook)

```tsx
"use client";
import * as React from "react";
import { Folder, ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { REPOS } from "@/lib/data";
import { useRepoStore } from "@/lib/store/use-repo-store";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { cn } from "@/lib/utils";

export function RepoSelector() {
  const { selectedRepo, setSelectedRepo } = useRepoStore();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-sm text-foreground/80 backdrop-blur transition-colors hover:border-instrument/40"
      >
        <Folder className="h-4 w-4 text-instrument" />
        <span className="text-muted-foreground">Repository</span>
        <span className="font-mono font-medium text-foreground">{selectedRepo}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl"
          >
            {REPOS.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => { setSelectedRepo(r.slug); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-accent",
                    !r.enabled && "opacity-40"
                  )}
                >
                  <span className="font-mono">{r.name}</span>
                  {r.slug === selectedRepo && <Check className="h-3.5 w-3.5 text-instrument" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: `top-strip.tsx`**

```tsx
"use client";
import { Search, Bell } from "lucide-react";
import { ControlPlaneMark } from "@/components/brand/control-plane-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { RepoSelector } from "./repo-selector";

export function TopStrip() {
  return (
    <header className="sticky top-0 z-40 mx-auto flex max-w-[1400px] items-center gap-3 rounded-2xl border border-border bg-card/40 px-3 py-2 backdrop-blur-xl">
      <ControlPlaneMark />
      <div className="leading-tight">
        <div className="text-sm font-medium">Control Plane</div>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground">OPS TOWER</div>
      </div>
      <div className="mx-1 h-6 w-px bg-border" />
      <RepoSelector />
      <div className="flex-1" />
      <button aria-label="Search" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><Search className="h-4 w-4" /></button>
      <button aria-label="Notifications" className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-status-error" /></button>
      <ThemeToggle />
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-instrument to-instrument-2 text-xs font-medium text-background">ER</div>
    </header>
  );
}
```

- [ ] **Step 3: `glass-dock-nav.tsx`**

```tsx
"use client";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, GitPullRequest, Tag, Settings } from "lucide-react";
import { GlassDock, type DockItem } from "@/components/ui/glass-dock";

const ROUTES = ["/dashboard", "/pull-requests", "/releases", "/settings"];

export function GlassDockNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = ROUTES.findIndex((r) => pathname.startsWith(r));

  const items: DockItem[] = [
    { title: "Dashboard", icon: LayoutDashboard, onClick: () => router.push("/dashboard") },
    { title: "Pull Requests", icon: GitPullRequest, onClick: () => router.push("/pull-requests") },
    { title: "Releases", icon: Tag, onClick: () => router.push("/releases") },
    { title: "Settings", icon: Settings, onClick: () => router.push("/settings") },
  ];

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <GlassDock items={items} activeIndex={activeIndex === -1 ? undefined : activeIndex} />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → Expected: no errors. (Note: `GlassDock` uses `bg-white/80 dark:bg-black/80` internally — acceptable for the dock surface in both modes.)

- [ ] **Step 5: Commit**

```bash
git add src/components/shell
git commit -m "feat(shell): repo selector, top strip, glass-dock nav"
```

---

### Task 8: App route group layout + page transition template

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/template.tsx`

**Interfaces:**
- Consumes: `TopStrip`, `GlassDockNav`, `GridField`, `PageTransition`.
- Produces: the shell that wraps every `(app)` page.

- [ ] **Step 1: Confirm Next 16 layout/template conventions**

Read `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` to confirm `layout.tsx`/`template.tsx` semantics for this version. Adjust the code below only if the API differs.

- [ ] **Step 2: `(app)/layout.tsx`**

```tsx
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
```

- [ ] **Step 3: `(app)/template.tsx`**

```tsx
"use client";
import { PageTransition } from "@/components/motion/page-transition";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
```

- [ ] **Step 4: Verify**

Run: `npm run dev`. Navigate to `/dashboard` (will 404 until Task 9/12) — but the shell (top strip + dock) should render on any `(app)` route created next. `npx tsc --noEmit` → no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/layout.tsx" "src/app/(app)/template.tsx"
git commit -m "feat(shell): (app) route-group layout + page-transition template"
```

---

### Task 9: States (EmptyState, Skeleton) + placeholder pages + PR tabs

**Files:**
- Create: `src/components/states/empty-state.tsx`
- Create: `src/components/states/skeleton.tsx`
- Create: `src/app/(app)/pull-requests/layout.tsx`
- Create: `src/app/(app)/pull-requests/page.tsx` (redirect to development)
- Create: `src/app/(app)/pull-requests/development/page.tsx`
- Create: `src/app/(app)/pull-requests/staging/page.tsx`
- Create: `src/app/(app)/releases/page.tsx`
- Create: `src/app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: `RadarRings`, `usePathname`.
- Produces: `EmptyState({title, description, icon?, action?})`, `Skeleton({className})`, `PullRequestsTabs` (inline in pull-requests layout).

- [ ] **Step 1: `empty-state.tsx`** (aviation: empty radar)

```tsx
import { RadarRings } from "@/components/motifs/radar-rings";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center">
      <div className="opacity-70"><RadarRings size={96} /></div>
      <h3 className="mt-4 text-base font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: `skeleton.tsx`** (shimmer)

```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted/50", className)}>
      <div className="absolute inset-0 -translate-x-full [animation:cp-shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
    </div>
  );
}
```

- [ ] **Step 3: `pull-requests/layout.tsx`** (segmented tabs over child routes)

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Development", href: "/pull-requests/development" },
  { label: "Staging", href: "/pull-requests/staging" },
];

export default function PullRequestsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <h1 className="text-lg font-medium">Pull Requests</h1>
      <div className="mt-3 inline-flex rounded-lg border border-border bg-card/40 p-1 backdrop-blur">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href}
            className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", pathname === t.href ? "bg-instrument/15 text-instrument" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
          </Link>
        ))}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: `pull-requests/page.tsx`** (default redirect)

```tsx
import { redirect } from "next/navigation";
export default function PullRequestsIndex() { redirect("/pull-requests/development"); }
```

- [ ] **Step 5: The four placeholder pages**

`pull-requests/development/page.tsx`:

```tsx
import { EmptyState } from "@/components/states/empty-state";
export default function Page() {
  return <EmptyState title="No pull requests targeting development" description="PRs into development will appear here in a later phase." />;
}
```

Create the other three with identical structure, changing only the title/description:

| File | title | description |
|---|---|---|
| `pull-requests/staging/page.tsx` | `No pull requests targeting staging` | `Staging syncs land here in a later phase.` |
| `releases/page.tsx` | `No releases yet` | `Published releases will appear here in a later phase.` |
| `settings/page.tsx` | `Settings` | `GitHub token and repository management arrive in a later phase.` |

(For `releases` and `settings`, wrap the `EmptyState` in a `<div><h1 className="text-lg font-medium">Releases|Settings</h1><div className="mt-5">…</div></div>` so the page has a heading.)

- [ ] **Step 6: Verify**

Run: `npm run dev`. Click each dock icon → Dashboard (404 until Task 12), Pull Requests (tabs + empty state, Development active by default), Releases, Settings all render with the shell, dock highlights the active item, and the repo selector opens/persists across reload. `npx tsc --noEmit` → no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/states "src/app/(app)/pull-requests" "src/app/(app)/releases" "src/app/(app)/settings"
git commit -m "feat(shell): empty/skeleton states, PR tabs, placeholder pages"
```

---

### Task 10: Dashboard cards — MetricCard + StatusWidget

**Files:**
- Create: `src/components/dashboard/metric-card.tsx`
- Create: `src/components/dashboard/status-widget.tsx`

**Interfaces:**
- Consumes: `AnimatedCounter`, `HudCorners`, `RadarRings`, `RunwayStripes`, `EnvironmentStatus`, lucide icons.
- Produces: `MetricCard({label, value, suffix?, delta?, deltaTone?, icon, footer?})`, `StatusWidget({status})`.

- [ ] **Step 1: `metric-card.tsx`**

```tsx
import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { HudCorners } from "@/components/motifs/hud-corners";
import { cn } from "@/lib/utils";

export function MetricCard({ label, value, suffix, delta, deltaTone = "muted", icon: Icon, footer }: {
  label: string; value?: number; suffix?: string; delta?: string;
  deltaTone?: "healthy" | "warn" | "muted"; icon: LucideIcon; footer?: React.ReactNode;
}) {
  const tone = { healthy: "text-status-healthy", warn: "text-status-warn", muted: "text-muted-foreground" }[deltaTone];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1 hover:border-instrument/40">
      <HudCorners className="opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-instrument" />
      </div>
      {value !== undefined && (
        <div className="mt-2 text-2xl font-medium">
          <AnimatedCounter value={value} suffix={suffix} />
        </div>
      )}
      {footer ?? (delta && <div className={cn("mt-1 text-[11px]", tone)}>{delta}</div>)}
    </div>
  );
}
```

- [ ] **Step 2: `status-widget.tsx`**

```tsx
import { RadarRings } from "@/components/motifs/radar-rings";
import { RunwayStripes } from "@/components/motifs/runway-stripes";
import type { EnvironmentStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

const TONE: Record<EnvironmentStatus["status"], { text: string; label: string }> = {
  healthy: { text: "text-status-healthy", label: "Healthy" },
  deploying: { text: "text-status-warn", label: "Deploying" },
  stable: { text: "text-instrument", label: "Stable" },
  degraded: { text: "text-status-error", label: "Degraded" },
};

export function StatusWidget({ status }: { status: EnvironmentStatus }) {
  const tone = TONE[status.status];
  const title = status.env === "main" ? "Main" : status.env[0].toUpperCase() + status.env.slice(1);
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-xl">
      <RunwayStripes className={cn("absolute -bottom-3.5 -right-3.5", tone.text)} />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", tone.text, "border-current/30 bg-current/10")}>{tone.label}</span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <span className={tone.text}><RadarRings size={44} /></span>
        <div>
          <div className="font-mono text-base font-medium">{status.env === "main" ? status.marker : status.openPRs}</div>
          <div className="text-[10px] text-muted-foreground">{status.env === "main" ? "current tag" : "open PRs"}</div>
        </div>
      </div>
      <div className="mt-1.5 font-mono text-[10px] text-muted-foreground">
        {status.progressPct ? `deploy in progress · ${status.progressPct}%` : `marker · ${status.marker}`}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → Expected: no errors. (Visual check in Task 12.)

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/metric-card.tsx src/components/dashboard/status-widget.tsx
git commit -m "feat(dashboard): MetricCard and StatusWidget"
```

---

### Task 11: Charts (Recharts) with risk gate

**Files:**
- Create: `src/components/dashboard/charts/merge-activity-chart.tsx`
- Create: `src/components/dashboard/charts/release-frequency-chart.tsx`
- Create: `src/components/dashboard/charts/deployment-timeline-chart.tsx`

**Interfaces:**
- Consumes: `recharts`, `MergeActivityPoint`, `ReleaseFrequencyPoint`, `DeploymentTimelinePoint`.
- Produces: `MergeActivityChart({data})`, `ReleaseFrequencyChart({data})`, `DeploymentTimelineChart({data})`.

- [ ] **Step 1: Risk gate — verify Recharts builds on this toolchain**

Run: `npx next build` after writing Step 2's file (or a throwaway import). If Recharts fails to compile/render under React 19 / Next 16, STOP and implement these three components as plain inline SVG (area path, bars, dotted timeline — reuse the shapes from the approved mockup) with the SAME exported names/props, then continue. Document which path was taken in the commit message.

- [ ] **Step 2: `merge-activity-chart.tsx`** (client; tokens via CSS var resolved to hex at runtime)

```tsx
"use client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { MergeActivityPoint } from "@/lib/data";

export function MergeActivityChart({ data }: { data: MergeActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="cpMerge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--instrument)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--instrument)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <Tooltip cursor={{ stroke: "var(--instrument)", strokeOpacity: 0.3 }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
        <Area type="monotone" dataKey="merges" stroke="var(--instrument)" strokeWidth={2} fill="url(#cpMerge)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: `release-frequency-chart.tsx`**

```tsx
"use client";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import type { ReleaseFrequencyPoint } from "@/lib/data";

export function ReleaseFrequencyChart({ data }: { data: ReleaseFrequencyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <XAxis dataKey="period" hide />
        <Bar dataKey="count" fill="var(--instrument-2)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: `deployment-timeline-chart.tsx`** (status dots over a baseline)

```tsx
"use client";
import type { DeploymentTimelinePoint } from "@/lib/data";

const COLOR = { success: "var(--status-healthy)", in_progress: "var(--status-warn)", failed: "var(--status-error)" } as const;

export function DeploymentTimelineChart({ data }: { data: DeploymentTimelinePoint[] }) {
  return (
    <div className="flex h-[120px] items-end justify-between gap-2 px-1 pb-4 pt-2">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[d.status] }} />
          <span className="font-mono text-[10px] text-muted-foreground">{d.day}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npx next build` → Expected: build succeeds (this is the Recharts compatibility gate). `npx tsc --noEmit` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/charts
git commit -m "feat(dashboard): merge/release/timeline charts (recharts)"
```

---

### Task 12: Dashboard page + responsive/reduced-motion + final verification

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/components/dashboard/dashboard-view.tsx` (client; composes cards/charts/widgets with stagger)

**Interfaces:**
- Consumes: `data` service, `MetricCard`, `StatusWidget`, the 3 charts, `FadeInUp`, `Stagger`, lucide icons.

- [ ] **Step 1: `dashboard-view.tsx`** (client component receiving fetched data)

```tsx
"use client";
import { GitPullRequest, Tag, Rocket, Radar, Activity } from "lucide-react";
import type { DashboardSummary, EnvironmentStatus, MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint } from "@/lib/data";
import { MetricCard } from "./metric-card";
import { StatusWidget } from "./status-widget";
import { MergeActivityChart } from "./charts/merge-activity-chart";
import { ReleaseFrequencyChart } from "./charts/release-frequency-chart";
import { DeploymentTimelineChart } from "./charts/deployment-timeline-chart";
import { FadeInUp } from "@/components/motion/fade-in";

export function DashboardView({ summary, envs, merge, release, timeline }: {
  summary: DashboardSummary; envs: EnvironmentStatus[];
  merge: MergeActivityPoint[]; release: ReleaseFrequencyPoint[]; timeline: DeploymentTimelinePoint[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-medium">Mission Control</h1>
        <p className="text-xs text-muted-foreground">Deployment overview · all systems nominal</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Active PRs" value={summary.activePullRequests} delta="▲ this week" deltaTone="healthy" icon={GitPullRequest} />
        <MetricCard label="Open Releases" value={summary.openReleases} delta="awaiting publish" deltaTone="warn" icon={Tag} />
        <MetricCard label="Last Deploy" icon={Rocket} footer={<div className="mt-2 font-mono text-sm">{summary.lastDeployment.sha}</div>} />
        <MetricCard label="Repo Status" icon={Radar} footer={<div className="mt-2 text-sm font-medium text-status-healthy capitalize">{summary.repositoryStatus}</div>} />
        <MetricCard label="Build Health" value={summary.buildHealthPct} suffix="%" delta="last 14 days" deltaTone="muted" icon={Activity} />
      </div>

      <FadeInUp className="rounded-xl border border-border/60 bg-card/40 p-3 backdrop-blur-xl">
        <div className="mb-1 text-sm font-medium">Merge Activity</div>
        <MergeActivityChart data={merge} />
      </FadeInUp>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 backdrop-blur-xl">
          <div className="mb-1 text-sm font-medium">Deployment Timeline</div>
          <DeploymentTimelineChart data={timeline} />
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 backdrop-blur-xl">
          <div className="mb-1 text-sm font-medium">Release Frequency</div>
          <ReleaseFrequencyChart data={release} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {envs.map((e) => <StatusWidget key={e.env} status={e} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `dashboard/page.tsx`** (server component fetches mock data for the selected repo)

Note: the selected repo lives in a client store (localStorage). For Phase 1 the dashboard reads the default repo on the server; wiring live repo-switch refetch is Phase 3 (React Query). Use the store's default here.

```tsx
import { data } from "@/lib/data";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const slug = "dashboard";
  const [summary, envs, merge, release, timeline] = await Promise.all([
    data.getDashboardSummary(slug),
    data.getEnvironmentStatuses(slug),
    data.getMergeActivity(slug),
    data.getReleaseFrequency(slug),
    data.getDeploymentTimeline(slug),
  ]);
  return <DashboardView summary={summary} envs={envs} merge={merge} release={release} timeline={timeline} />;
}
```

- [ ] **Step 3: Responsive + reduced-motion pass**

Confirm grids collapse (cards 2-col on mobile / 5-col on lg; status widgets 1-col on mobile / 3-col on md). Confirm `motion-reduce:hidden` hides the radar sweeps and that counters/transitions are gated (framer-motion respects `prefers-reduced-motion` automatically for `whileInView`/spring; verify the sweep CSS animation is gated via the `motion-reduce:hidden` class already added in Task 2).

- [ ] **Step 4: Final verification**

Run: `npx tsc --noEmit` → no errors.
Run: `npx next build` → succeeds.
Run: `npm run dev` and confirm against the approved mockup:
  - `/` redirects to `/dashboard`; dock highlights Dashboard.
  - Dashboard shows 5 metric cards (counters animate up), Merge Activity + Deployment Timeline + Release Frequency charts, and Development/Staging/Main status widgets with radar sweeps.
  - Top strip: brand, repo selector (opens, switches, persists across reload), search/bell/theme-toggle/avatar.
  - Theme toggle flips dark/light with no unreadable text.
  - Resize to tablet/mobile: grids reflow, dock + top strip stay usable.
  - DevTools → emulate `prefers-reduced-motion: reduce`: radar sweeps stop.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/dashboard" src/components/dashboard/dashboard-view.tsx
git commit -m "feat(dashboard): compose mission-control dashboard from mock data"
```

---

## Self-Review

**Spec coverage:**
- Shell (dock + top strip) → Tasks 6–8. ✓
- Theme dark+toggle, accent/status tokens → Task 1. ✓
- Motifs + motion + states → Tasks 2, 3, 9. ✓
- Data service (swap-friendly) + mock → Tasks 4. ✓
- Repo selector + persisted store → Tasks 5, 7. ✓
- Dashboard: 5 cards + 3 charts + 3 status widgets + counters → Tasks 10–12. ✓
- Placeholder routes + PR tabs (Development/Staging) → Task 9. ✓
- Responsive + reduced-motion → Task 12. ✓
- Charts via Recharts + SVG fallback gate → Task 11. ✓
- Success criteria (tsc/build/visual/toggle/responsive) → Task 12 Step 4. ✓

**Placeholder scan:** No "TBD"/"add error handling"/vague steps; every code step shows code. The four placeholder pages give full code for one + an explicit per-file value table (not "similar to"). ✓

**Type consistency:** `DataService` method names match between `data-service.ts`, `MockDataService`, and `dashboard/page.tsx`. `EnvironmentStatus`/`DashboardSummary` field names match between fixtures, `StatusWidget`, `MetricCard`, and `DashboardView`. `GlassDockProps.activeIndex` (Task 6) matches `GlassDockNav` usage (Task 7). `DockItem` shape matches lucide icon components. ✓

**Out-of-scope deferrals noted:** live repo-switch refetch (Task 12 Step 2 note), real GitHub/auth (spec roadmap). ✓
