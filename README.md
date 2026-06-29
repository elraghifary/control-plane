# Control Plane

A premium DevOps mission-control dashboard for driving GitHub deployments across `development → staging → main`, themed as an aircraft control tower.

Built for [happykids.id](https://happykids.id) with Next.js 16 + React 19.

---

## Features

- **Live GitHub data** — dashboard metrics, pull requests, and releases pulled in real-time via Octokit
- **Pull request management** — list, review, merge, close, reopen, and sync development → staging across multiple repositories
- **Releases** — browse release history with full markdown changelogs; publish new minor/patch releases with auto-generated notes
- **Auth** — GitHub PAT-based login; token stored AES-256-GCM encrypted at rest, never sent to the client
- **Repository selector** — switch between repositories from the top bar; state persisted in a cookie

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.9 (App Router) |
| UI | React 19.2.4, Tailwind v4, Radix UI |
| Auth | Auth.js v5 (Credentials + JWT) |
| GitHub | Octokit REST |
| Charts | Recharts |
| Markdown | react-markdown + remark-gfm |
| Animations | Framer Motion |

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn 1.x
- A GitHub Personal Access Token with `repo` and `read:org` scopes

### Setup

```bash
cp .env.example .env.local
# fill in AUTH_SECRET and optionally CONTROL_PLANE_GITHUB_ORGS
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000). Register with your GitHub PAT to connect.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | Yes | Random secret for Auth.js JWT signing (`openssl rand -base64 32`) |
| `CONTROL_PLANE_GITHUB_ORGS` | No | Comma-separated org names to include in the repo selector |

## Commands

```bash
yarn dev          # Start dev server
yarn build        # Production build
yarn lint         # ESLint
npx tsc --noEmit  # Type-check (primary verification gate)
```

## Project Structure

```
src/
  app/
    (auth)/         # Login & register (no shell)
    (app)/          # Auth-guarded app shell
      dashboard/
      pull-requests/
      releases/
      settings/
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
    auth/           # AES-256-GCM crypto helpers
    data/           # DataService interface + OctokitDataService + MockDataService
    store/          # JsonFileStore (user accounts)
```
