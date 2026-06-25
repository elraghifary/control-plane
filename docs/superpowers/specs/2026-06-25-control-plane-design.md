# Control Plane — Phase 1 (Foundations) Design

Date: 2026-06-25
Status: Approved direction, spec under review
Author: brainstormed with the operator (elra)

## 1. Product summary

Control Plane is a premium DevOps dashboard for driving GitHub-based deployments
across `development → staging → main`, themed as an aircraft control tower / mission
control for software ("GitHub + Vercel + Linear + Vengeance UI"). It manages Pull
Requests (review/approve/merge), staging syncs (single + bulk), and Releases against
multiple repositories, using the GitHub REST API via Octokit. Persistence starts
local (JSON) and is designed to swap to Postgres later.

This document specifies **Phase 1 (Foundations) only**. Later phases get their own
spec → plan → implementation cycle.

## 2. Locked decisions

- **Build strategy:** phased, foundations-first (not one big build).
- **Theme:** dark-first with a light-mode toggle (cockpit-at-night aesthetic).
- **Palette:** the existing neutral shadcn tokens in `globals.css` stay **unchanged**.
  A cyan "instrument" accent + status colors are layered on top as new CSS variables.
- **Charts:** Recharts (via the shadcn `chart` component), using the `--chart-*`
  tokens. Compatibility with React 19 / Next 16 must be verified first; documented
  fallback is lightweight custom SVG charts if Recharts misbehaves.
- **Data in Phase 1:** mock fixtures behind a typed service interface. No real
  GitHub, no auth yet.

## 3. Phasing roadmap (context — only Phase 1 is specified here)

1. **Foundations (this spec):** app shell, design system, mock-data Dashboard.
2. **Auth & persistence:** login page, local JSON storage (users + GitHub PAT),
   session, repository/service abstraction for storage.
3. **GitHub read:** Octokit service implementing the data interface; wire Dashboard
   and PR lists to live data; React Query introduced here.
4. **GitHub write:** PR review/approve/merge, Create Staging, Bulk Create Staging
   (animated progress modal), Create Release.
5. **Settings & polish:** token validate/test, repo enable/disable, responsive and
   micro-interaction polish.

## 4. Phase 1 scope

**In scope**
- App shell: collapsible sidebar nav + top bar with repository selector.
- Theming: dark default + light toggle; cyan accent + status color tokens.
- Aviation design-system primitives (radar, runway, HUD, grid) + motion primitives.
- Reusable states: skeleton shimmer, aviation empty states, toast provider (Sonner).
- Dashboard rendered entirely from **mock data**: 5 metric cards, 3 charts, 3
  environment status widgets, animated counters.
- Styled placeholder pages for the non-dashboard routes so navigation works.

**Out of scope (later phases)**
- Login/auth, sessions, real credential storage.
- Octokit / any real GitHub calls; React Query.
- PR review/approve/merge, staging creation, bulk staging, releases.
- Settings actions (token validate/test, repo enable/disable beyond static list).

The shell assumes a hard-coded mock signed-in operator.

## 5. Architecture

### 5.1 Routing & shell (App Router)
- Route group `(app)` whose `layout.tsx` renders the shell (sidebar + top bar) once.
- Pages: `(app)/dashboard`, `(app)/pull-requests/development`, `.../staging`,
  `.../release`, `(app)/settings`. `/` redirects to `/dashboard`.
- `(app)/template.tsx` wraps page content in a Framer Motion transition (templates
  re-mount on navigation; layouts do not).
- Mock data is read in Server Components where practical; interactive pieces
  (repo selector, theme toggle, charts, counters) are Client Components.
- **Next 16 specifics to verify against `node_modules/next/dist/docs/` before coding:**
  `unstable_instant` export for fast client navigation (`01-app/02-guides/instant-navigation`),
  layout/template conventions (`01-app/01-getting-started/03-layouts-and-pages`),
  and server/client boundaries (`...05-server-and-client-components`).

### 5.2 Design system
- `src/app/providers.tsx`: `next-themes` ThemeProvider (`attribute="class"`,
  `defaultTheme="dark"`) + Sonner `<Toaster/>`. Uses the already-stubbed
  `ThemeToggle`.
- Accent + status colors added to `globals.css` as **new** variables for both
  `:root` (light) and `.dark`, leaving existing neutral tokens untouched:
  - `--instrument` (cyan; dark ≈ `#38bdf8`), `--instrument-2` (indigo ≈ `#6366f1`),
  - `--status-healthy` (green ≈ `#34d399`), `--status-warn` (amber ≈ `#fbbf24`),
    `--status-error` (red ≈ `#f87171`).
  Each gets a light-mode value too so both themes read correctly.
- **Motion primitives** (`src/components/motion/`): `PageTransition`, `FadeInUp`,
  `Stagger`, `AnimatedCounter` (reuses VengeanceUI `animated-number`).
- **Aviation motif primitives** (`src/components/motifs/`): `RadarRings` (animated
  sweep), `RunwayStripes`, `HudCorners`, `GridField`.
- **States** (`src/components/states/`): `Skeleton` (shimmer), `EmptyState`
  (aviation illustration + message + optional action), `Toaster` re-export.

### 5.3 Data & service layer (swap-friendly)
- `src/lib/data/types.ts`: domain models (section 6).
- `src/lib/data/data-service.ts`: `DataService` interface with **only** the methods
  Phase 1 needs. Grows per phase — no speculative methods.
- `src/lib/data/mock-data-service.ts`: `MockDataService implements DataService`,
  returning data from `src/lib/data/fixtures/*`.
- `src/lib/data/index.ts`: exports the active service (`export const data:
  DataService = new MockDataService()`). Later phases swap this one line to an
  Octokit-backed implementation; storage gets the same treatment in Phase 2.

### 5.4 State
- `src/lib/store/use-repo-store.ts`: Zustand store holding the selected repository
  slug, persisted to `localStorage` (survives reload; later drives PR/Release
  refetch). Add `zustand` as a direct dependency.
- Theme handled by `next-themes`. No React Query in Phase 1 (nothing async until
  Phase 3).

### 5.5 Charts
- Add `recharts` + the shadcn `chart` component (`src/components/ui/chart.tsx`).
- Dashboard chart wrappers in `src/components/dashboard/charts/`:
  `merge-activity-chart.tsx` (area), `release-frequency-chart.tsx` (bar),
  `deployment-timeline-chart.tsx` (timeline as a small composed bar/scatter).
- Charts consume `--chart-*` tokens for theme-awareness.
- **Risk gate:** if Recharts fails to build/render on React 19 / Next 16, fall back
  to custom animated SVG chart components with the same props and file names.

## 6. Domain models (Phase 1 subset)

```ts
type EnvName = 'development' | 'staging' | 'main';

interface Repository { id: string; name: string; slug: string; enabled: boolean; defaultBranch: string; }

interface Deployment { env: EnvName; ref: string; sha: string; deployedAt: string; status: 'success' | 'in_progress' | 'failed'; }

interface DashboardSummary {
  activePullRequests: number;
  openReleases: number;
  lastDeployment: Deployment;
  repositoryStatus: 'operational' | 'degraded' | 'down';
  servicesOnline: number;
  buildHealthPct: number; // 0..100
}

interface EnvironmentStatus {
  env: EnvName;
  status: 'healthy' | 'deploying' | 'stable' | 'degraded';
  openPRs: number;
  lastDeployAt: string;
  marker: string;       // sha for dev/staging, tag for main
  progressPct?: number; // present while deploying
}

interface MergeActivityPoint { date: string; merges: number; }
interface ReleaseFrequencyPoint { period: string; count: number; }
interface DeploymentTimelinePoint { day: string; status: 'success' | 'in_progress' | 'failed'; }

interface DataService {
  listRepositories(): Promise<Repository[]>;
  getDashboardSummary(repoSlug: string): Promise<DashboardSummary>;
  getEnvironmentStatuses(repoSlug: string): Promise<EnvironmentStatus[]>;
  getMergeActivity(repoSlug: string): Promise<MergeActivityPoint[]>;
  getReleaseFrequency(repoSlug: string): Promise<ReleaseFrequencyPoint[]>;
  getDeploymentTimeline(repoSlug: string): Promise<DeploymentTimelinePoint[]>;
}
```

Mock repositories: `dashboard, api, payment, notification, users, inventory`.

## 7. Components to build

Shell: `Sidebar`, `Topbar`, `RepoSelector`, mock `UserChip`.
Dashboard: `MetricCard`, `StatusWidget`, the 3 chart wrappers, `DashboardGrid`.
Motifs: `RadarRings`, `RunwayStripes`, `HudCorners`, `GridField`.
Motion: `PageTransition`, `FadeInUp`, `Stagger`, `AnimatedCounter`.
States: `EmptyState`, `Skeleton`, `Toaster`.
Pages: `dashboard/page.tsx` (real), 4 placeholder pages, root redirect, `providers.tsx`.
Reused VengeanceUI: `animated-number` (counters), `glow-border-card` (cards);
`aurora-hero`/`light-lines`/`liquid-gradient` reserved for the Phase 2 login hero.

## 8. Visual design reference (approved mockup)

Dark cockpit base (`~#0a0b0d`) with a faint navigation grid and corner radar rings;
cyan instrument glow; glass cards (subtle white-alpha gradient + 1px border, hover
lift); monospace HUD readouts (SHAs, percentages, tags). Layout: ~172px left sidebar
(brand radar logo + "Control Plane / OPS TOWER"; Dashboard active; Pull Requests
group → Development/Staging/Release; Settings; operator chip with pulsing "on
station" dot). Top bar: page title "Mission Control", repository selector pill,
search/notifications/theme-toggle. Content: 5 metric cards (Active PRs, Open
Releases, Last Deploy, Repo Status, Build Health), Merge Activity + Release Frequency
+ Deployment Timeline charts, and Development/Staging/Main status widgets with radar
sweeps and runway-stripe accents.

## 9. Dependencies to add (Phase 1)

`zustand` (direct), `recharts`, `sonner`, shadcn `chart` + `sonner` components.
Already present: `framer-motion`, `next-themes`, `lucide-react`, VengeanceUI set.

## 10. Accessibility & responsive

- Desktop-first; sidebar collapses to icons/drawer on tablet/mobile; status/PR
  tables become stacked cards in later phases.
- Respect `prefers-reduced-motion` (gate radar sweeps, counters, transitions).
- Color is never the only status signal (icon + label accompany every status color).

## 11. Success criteria (verifiable)

- `npx tsc --noEmit` clean; `next build` succeeds.
- App boots; `/` redirects to `/dashboard`.
- Sidebar navigates to all five routes (placeholders render for non-dashboard).
- Repository selector switches the active repo and persists across reload; header
  reflects the selection.
- Dashboard renders 5 cards + 3 charts + 3 status widgets from `MockDataService`,
  with animated counters, fade-in stagger, and radar sweeps.
- Dark default; light toggle works with no unreadable text in either mode.
- Layout holds at desktop, tablet, and mobile widths.

## 12. Risks / open items

- Recharts on React 19 / Next 16 (mitigated by SVG fallback).
- Next 16 routing/transition specifics (`template.tsx`, `unstable_instant`) — verify
  against bundled docs before coding.
- Light-mode values for the new accent/status tokens need a deliberate pass so the
  cockpit look survives in light mode.
