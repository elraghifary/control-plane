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

Control Plane is a premium DevOps mission-control dashboard for driving GitHub deployments across `development → staging → main`, themed as an aircraft control tower. All core pages are live with real GitHub data: dashboard, pull requests (list/review/merge/sync), releases (list/publish, with optional development → main sync), and settings (password/PAT management plus admin-only user invites). Accounts are invite-only, backed by Supabase Postgres — see the Auth & persistence section below.

### Auth & persistence (`src/auth.ts`, `src/lib/store/`, `src/lib/auth/`)

- **Auth.js v5** Credentials provider (email + password) + JWT session, carrying `isAdmin`. Route handler at `src/app/api/auth/[...nextauth]/route.ts`.
- **`(auth)` route group** — `/login` and `/invite/[token]` (minimal shell, no dock). There is no self-serve registration — accounts are created only by accepting an admin-issued invite, which validates a GitHub PAT via Octokit `GET /user` and stores it **AES-256-GCM encrypted**.
- **`Store` interface** in `src/lib/store/`, implemented by `SupabaseStore` (Postgres via `@supabase/supabase-js`, service-role key). Covers users (`email`, `isAdmin`, `passwordHash`, `patEncrypted`, `githubLogin` — GitHub login from PAT validation is the display handle, there's no separate username) and `invites` (hashed token, 7-day expiry, one-time use). Schema lives in `supabase/migrations/`; apply with `yarn db:migrate <file>` (uses `pg` against `POSTGRES_URL_NON_POOLING` — no Supabase CLI project link required, though the CLI is available).
- **Admin-only user management**: Settings → Users (visible when `session.user.isAdmin`) lists accounts and can invite, promote/demote admin, and remove users. All three actions are re-checked server-side in `(app)/settings/actions.ts`, not just gated in the UI. An admin can't demote/remove themselves or demote the last remaining admin.
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
- `/` redirects to `/dashboard`. Routes: `dashboard`, `pull-requests`, `releases`, `settings`.
- Dock active state is derived from `usePathname()` matching against the `ROUTES` array in `glass-dock-nav.tsx`.

### State & theming

- **Selected repository**: `cp-repository` httpOnly-readable cookie (set by `RepositorySelector` client component). Layout + all pages read it server-side. Optional env `CONTROL_PLANE_GITHUB_ORGS` adds org repos to the list.
- **Theme**: `next-themes` in `src/app/providers.tsx`, `attribute="class"`, **dark default**, system disabled. Sonner `<Toaster />` lives here too.

### Component organization (`src/components/`)

- `ui/` — shared primitives: `button`, `badge`, `dialog`, `popover`, `command`, `button-group`, etc.
- `shell/` — app chrome: `top-strip`, `glass-dock-nav`, `repository-selector`.
- `dashboard/` — `metric-card`, `status-widget`, `dashboard-view`, and `charts/` (Recharts wrappers consuming `--chart-*` tokens).
- `pull-requests/` — `pr-list`, `pr-card`, `review-dialog`, `sync-staging-dialog`, `markdown-view`, `pr-files-viewer`.
- `releases/` — `release-card`, `publish-release-dialog`.
- `motifs/` — aviation design primitives: `radar-rings`, `runway-stripes`, `hud-corners`, `grid-field`.
- `motion/` — `page-transition`, `fade-in`, `animated-counter`.
- `states/` — `empty-state`, `error-state`.

### Styling conventions

- Tailwind **v4** (config-less; theme tokens live in `src/app/globals.css` via `@theme`). Import via `@/` alias (maps to `src/`). Use `cn()` from `@/lib/utils` for class merging.
- The neutral shadcn tokens in `globals.css` are **locked — do not change them.** `--primary` is set to HappyKids yellow (`--hk-yellow-500`) with navy foreground. Accent/status colors are layered on as separate variables: `instrument` (blue), `instrument-2` (purple), `status-healthy`/`status-warn`/`status-error`.
- **HappyKids brand palette** is defined in `globals.css` as `--hk-navy-*`, `--hk-yellow-*`, `--hk-red`, `--hk-amber`, `--hk-purple`, `--hk-pink`, `--hk-blue`, `--hk-teal` and exposed as Tailwind tokens (`text-hk-navy-500`, etc.).
- **Reference colors via Tailwind tokens** (`text-instrument`, `bg-status-healthy`), never hardcoded hex.
- Every component must stay readable in **both** dark and light mode — use semantic tokens, not raw white-alpha.
- Respect `prefers-reduced-motion` for all looping/entrance animations (radar sweeps, counters, page transitions).
- Color is never the only status signal — pair it with an icon + label.

## Working in this repo

- Stay within the current request's scope; don't build ahead speculatively.
- Branch: feature work happens off `main`. Commit after each logical task.

### Dialog conventions

All multi-step dialogs follow this structure:
- Header: `px-5 py-4` with `text-base` title
- Content: `px-5 py-5` scrollable area
- Footer: `flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4`
- Form labels: `mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground`
- No icons on action buttons; `rounded-full` on all buttons

## Some rules
- Do not commit each file, just summarize and use one commit
- No need to screenshot browser every changes, use it if its really needed to verify the UI
- No need to commit and deploy every question or task
- Use capitalize for button name e.g. Confirm action become Confirm Action
