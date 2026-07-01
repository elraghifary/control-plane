# Control Plane

A premium DevOps mission-control dashboard for driving GitHub deployments across `development → staging → main`, themed as an aircraft control tower.

Built for [happykids.id](https://happykids.id) with Next.js 16 + React 19.

---

## Features

- **Live GitHub data** — dashboard metrics, pull requests, and releases pulled in real-time via Octokit
- **Pull request management** — list, review, merge, close, reopen, and sync development → staging across multiple repositories
- **Releases** — browse release history with full markdown changelogs; publish new minor/patch releases with auto-generated notes, optionally syncing development → main first
- **Auth** — email + password login backed by Supabase Postgres; each account holds a GitHub PAT stored AES-256-GCM encrypted at rest, never sent to the client
- **Invite-only accounts** — there is no self-serve registration; admins invite teammates by email from Settings → Users, generating a one-time link (7-day expiry) the invitee uses to set a password and connect their own GitHub PAT
- **Admin management** — promote/demote admins and remove accounts from Settings → Users, with server-side guardrails against self-demotion and removing the last admin
- **Repository selector** — switch between repositories from the top bar, grouped by org; state persisted in a cookie

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.9 (App Router) |
| UI | React 19.2.4, Tailwind v4, Radix UI |
| Auth | Auth.js v5 (Credentials + JWT) |
| Data store | Supabase (Postgres via `@supabase/supabase-js`, service-role key) |
| GitHub | Octokit REST |
| Charts | Recharts |
| Markdown | react-markdown + remark-gfm |
| Animations | Framer Motion |

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn 1.x
- A Supabase project (Postgres) — schema in `supabase/migrations/`
- A GitHub Personal Access Token with `repo` and `read:org` scopes, for each user account

### Setup

```bash
cp .env.example .env.local
# fill in AUTH_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POSTGRES_URL_NON_POOLING,
# and optionally CONTROL_PLANE_GITHUB_ORGS
yarn install
yarn db:migrate supabase/migrations/0001_users_admin_invites.sql
yarn dev
```

There's no self-serve registration — bootstrap your first account directly in Supabase (insert a row into `users` with `is_admin = true`), then invite everyone else from Settings → Users.

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Yes | Random secret for Auth.js JWT signing and PAT encryption (`openssl rand -base64 32`) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server-only, never exposed to the client) |
| `POSTGRES_URL_NON_POOLING` | Yes | Direct Postgres connection string, used by `yarn db:migrate` to apply schema changes |
| `CONTROL_PLANE_GITHUB_ORGS` | No | Comma-separated org names to include in the repo selector |

## Commands

```bash
yarn dev          # Start dev server
yarn build        # Production build
yarn lint         # ESLint
npx tsc --noEmit  # Type-check (primary verification gate)
yarn db:migrate <path-to-sql-file>  # Apply a schema change to Supabase
```

## Project Structure

```
src/
  app/
    (auth)/         # Login & invite acceptance (no shell)
    (app)/          # Auth-guarded app shell
      dashboard/
      pull-requests/
      releases/
      settings/     # Password/PAT forms + admin-only Users management
  components/
    dashboard/      # Metric cards, status widgets, charts
    pull-requests/  # PR list, review dialog, sync staging dialog
    releases/       # Release cards, publish dialog
    shell/          # Top strip, repository selector, dock nav
    motifs/         # Aviation design primitives (radar, runway, HUD)
    motion/         # Page transitions, animated counter
    states/         # Empty state, error state
    ui/             # Shared primitives (Button, Badge, Dialog, …)
  lib/
    auth/           # AES-256-GCM crypto helpers, invite token generation
    data/           # DataService interface + OctokitDataService + MockDataService
    store/          # Store interface + SupabaseStore (users, invites)
supabase/
  migrations/       # SQL schema, applied via `yarn db:migrate`
```
