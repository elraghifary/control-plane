# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ This is NOT the Next.js you know

This project uses **Next.js 16.2.9 + React 19.2.4**, which have breaking changes from older versions — APIs, conventions, and file structure may differ from your training data. **Read the relevant guide in `node_modules/next/dist/docs/` before writing routing/rendering code.** Heed deprecation notices. Key docs to check: `01-app/01-getting-started/03-layouts-and-pages.md`, `.../05-server-and-client-components.md`, and `01-app/02-guides/instant-navigation.mdx`.

## Commands

Package manager is **Yarn 1.x** (use `yarn add`, not `npm install`).

```bash
yarn dev              # Start dev server (http://localhost:3000)
yarn build            # Production build (next build) — run before claiming UI work is done
yarn start            # Serve the production build
yarn lint             # ESLint (eslint-config-next: core-web-vitals + typescript)
npx tsc --noEmit      # Type-check; must be clean — this is the primary verification gate
```

**There is no test framework** (a deliberate choice). Verification = `npx tsc --noEmit` clean + (for UI changes) a `yarn dev` visual check + `yarn build` at milestones.

## Architecture

Control Plane is a premium DevOps mission-control dashboard for driving GitHub deployments across `development → staging → main`, themed as an aircraft control tower. **Current state: Phase 2/3 (Auth + Octokit read).** Authenticated users get live GitHub data on the dashboard via `getDataService()`; pull-requests, releases, and settings routes are still styled placeholders. Read `docs/superpowers/specs/2026-06-26-control-plane-auth-octokit-design.md` for the latest spec and `docs/superpowers/specs/2026-06-25-control-plane-design.md` for the full phased roadmap.

### Auth & persistence (`src/auth.ts`, `src/lib/store/`, `src/lib/auth/`)

- **Auth.js v5** Credentials provider + JWT session. Route handler at `src/app/api/auth/[...nextauth]/route.ts`.
- **`(auth)` route group** — `/login`, `/register` (minimal shell, no dock). Registration validates a GitHub PAT via Octokit `GET /user`, then stores it **AES-256-GCM encrypted** in `.data/users.json` (gitignored).
- **`Store` interface** + `JsonFileStore` in `src/lib/store/` — user accounts only; not to be confused with client-side Zustand (removed).
- **`(app)/layout.tsx`** calls `auth()` and redirects unauthenticated requests to `/login`. PAT never reaches the client.

### Swap-friendly data layer (`src/lib/data/`)

Pages depend only on the `DataService` **interface**, never on a concrete implementation:

- `data-service.ts` — the `DataService` interface. Grows one method per phase; **no speculative methods**.
- `octokit-data-service.ts` — `OctokitDataService implements DataService` (live GitHub REST).
- `get-data-service.ts` — server-only factory: `auth()` → decrypt PAT → `OctokitDataService`. Memoized with `React.cache` per request. **Use this in `(app)` Server Components**, not the mock singleton.
- `mock-data-service.ts` + `index.ts` — `MockDataService` retained for dev; `export const data` still points at mock.
- `types.ts` — domain models. `slug` = GitHub `owner/repo` full name.

Pages fetch in **Server Components** and pass plain data down to Client Components (e.g. `dashboard/page.tsx` calls `getDataService()`, reads the `cp-repo` cookie for selection, then renders `<DashboardView />`).

### Routing & shell (App Router)

- Route group **`(app)`** — auth-guarded; `layout.tsx` fetches repos via `getDataService()` and renders `<GridField />`, `<TopStrip repos selected githubLogin />`, and `<GlassDockNav />`. **No left sidebar**; full-bleed with bottom padding for the dock.
- `(app)/template.tsx` wraps page content in a Framer Motion `PageTransition` (templates re-mount on navigation; layouts do not — this is why the transition lives in a template, not the layout).
- `/` redirects to `/dashboard`. Routes: `dashboard`, `pull-requests` (+ nested `layout.tsx` with `development`/`staging` tab strip), `releases`, `settings`.
- Dock active state is derived from `usePathname()` matching against the `ROUTES` array in `glass-dock-nav.tsx`.

### State & theming

- **Selected repository**: `cp-repo` httpOnly-readable cookie (set by `RepoSelector` client component). Layout + dashboard both read it server-side. Optional env `CONTROL_PLANE_GITHUB_ORGS` adds org repos to the list.
- **Theme**: `next-themes` in `src/app/providers.tsx`, `attribute="class"`, **dark default**, system disabled. Sonner `<Toaster />` lives here too.

### Component organization (`src/components/`)

- `ui/` — large library of reusable/VengeanceUI presentational components (buttons, cards, motion toys). The shell reuses `glass-dock`, `animated-number`, `glow-border-card`. Many others are reserved for later phases — don't assume all are wired in.
- `shell/` — app chrome: `top-strip`, `glass-dock-nav`, `repo-selector`.
- `dashboard/` — `metric-card`, `status-widget`, `dashboard-view`, and `charts/` (Recharts wrappers consuming `--chart-*` tokens).
- `motifs/` — aviation design primitives: `radar-rings`, `runway-stripes`, `hud-corners`, `grid-field`.
- `motion/` — `page-transition`, `fade-in`, `animated-counter`.
- `states/` — `skeleton`, `empty-state`, `error-state`.

### Styling conventions

- Tailwind **v4** (config-less; theme tokens live in `src/app/globals.css` via `@theme`). Import via `@/` alias (maps to `src/`). Use `cn()` from `@/lib/utils` for class merging.
- The neutral shadcn tokens in `globals.css` are **locked — do not change them.** Accent/status colors are layered on as separate variables: `instrument` (cyan), `instrument-2` (indigo), `status-healthy`/`status-warn`/`status-error`.
- **Reference colors via Tailwind tokens** (`text-instrument`, `bg-status-healthy`), never hardcoded hex.
- Every component must stay readable in **both** dark and light mode — use semantic tokens, not raw white-alpha.
- Respect `prefers-reduced-motion` for all looping/entrance animations (radar sweeps, counters, page transitions).
- Color is never the only status signal — pair it with an icon + label.

## Working in this repo

- Work is spec-driven and phased: a spec → plan → implementation cycle lives in `docs/superpowers/`. Stay within the current phase's scope; don't build ahead speculatively.
- Branch: feature work happens off `main` (current: `control-plane-foundations`). Commit after each logical task.

## Some rules
- Do not commit each file, just summarize and use one commit
- No need to screenshot browser every changes, use it if its really needed to verify the UI
