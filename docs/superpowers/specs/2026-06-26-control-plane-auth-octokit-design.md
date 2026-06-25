# Control Plane — Phase 2/3 (Auth + Octokit) Design

Date: 2026-06-26
Author: brainstormed with the operator (elra)
Status: approved (design); spec pending operator review

## 1. Summary

Add real authentication and real GitHub data to Control Plane, replacing the
Phase 1 mock. Users sign in with a **username + password**; each account stores a
GitHub **Personal Access Token (PAT)** captured at registration. The PAT is used
**server-side only** to call the GitHub REST API via Octokit, implementing the
existing `DataService` interface — the swap the Phase 1 foundation was built for.

This combines the Phase 1 roadmap's Phase 2 (Auth & persistence) and Phase 3
(GitHub read) into one vertical slice: auth → token → real data.

## 2. Locked decisions

- **Login model:** username + password (per-user accounts) + a stored GitHub PAT.
  Multi-user capable. Registration is **open by default** (first-run friendly).
- **Auth library:** **Auth.js v5** (`next-auth@beta`, `5.0.0-beta.31`) with a
  **Credentials** provider and **JWT** session strategy (required for Credentials).
  Peer deps officially list `next ^16` and `react ^19` — supported on this stack.
- **PAT at rest:** **AES-256-GCM**; key derived from `AUTH_SECRET` via HKDF
  (one secret to set). Password hashing: Node **`crypto.scrypt`**. No crypto deps.
- **Storage:** a `Store` interface backed by `JsonFileStore` (`.data/users.json`,
  gitignored). Swappable to SQLite later — same interface.
- **GitHub data scope:** **Repos + PRs + Releases** are real; environment status
  and deployment timeline are **best-effort** from the Deployments API (graceful
  empty); dashboard summary is **composed** from these.
- **Repo source:** **both** the user's repos and configured org repos, deduped.
  `slug` becomes the GitHub **`owner/repo`** full name (unique across sources).
- **New deps:** `next-auth@beta`, `octokit`. Everything else: Node built-ins.
- **Env:** `AUTH_SECRET` (required), `CONTROL_PLANE_GITHUB_ORGS` (optional,
  comma-separated). Documented in `.env.example`.

## 3. Non-goals (YAGNI — explicitly out)

Email verification, password reset, roles/permissions, GitHub OAuth, in-app org
management UI (orgs come from env), React Query, repo enable/disable actions, and
the Settings token-test UI (Phase 5). No DB. No multi-tenant concerns beyond
per-user accounts.

## 4. Architecture

```
Browser (login / register forms)
   │  username+password   (PAT supplied only at register)
   ▼
Auth.js (Credentials provider, JWT in httpOnly signed cookie)
   │  authorize() verifies vs Store; jwt/session callbacks thread userId + display
   ▼
Store  ──backed by──▶  JsonFileStore (.data/users.json)
   ▼
getDataService()  (server-only factory: auth() → userId → load user → decrypt PAT)
   ▼
OctokitDataService(pat, orgs)  implements existing DataService
   ▼
Dashboard / PR pages  (consumers unchanged)
```

The `DataService` interface and every UI consumer are unchanged. The PAT never
appears in the client bundle, the JWT, or any cookie.

## 5. Domain models (new)

```ts
interface User {
  id: string;            // uuid
  username: string;      // unique, stored lowercased
  passwordHash: string;  // scrypt, format "saltHex:hashHex"
  patEncrypted: string;  // AES-256-GCM, format "ivB64:tagB64:cipherB64"
  githubLogin: string;   // from GET /user at register
  avatarUrl?: string;
  createdAt: string;     // ISO
}
```

Auth.js JWT/session payload: `{ userId, githubLogin, avatarUrl }` — no PAT.

## 6. Modules & interfaces

- `src/lib/auth/crypto.ts`
  - `hashPassword(pw): string` / `verifyPassword(pw, stored): boolean` (scrypt +
    `timingSafeEqual`)
  - `encryptPat(pat): string` / `decryptPat(enc): string` (AES-256-GCM; key =
    HKDF(`AUTH_SECRET`, info "control-plane-pat-v1"))
- `src/lib/store/store.ts` — `Store` interface:
  `getUserByUsername`, `getUserById`, `createUser`, `updateUserPat`.
- `src/lib/store/json-file-store.ts` — `JsonFileStore implements Store`; reads/writes
  `.data/users.json` with read-modify-write under a tiny in-process mutex.
  `src/lib/store/index.ts` exports the singleton `store`.
- `src/auth.ts` — Auth.js config: Credentials provider, `session.strategy="jwt"`,
  `pages.signIn="/login"`, jwt/session callbacks. Exports `handlers, auth, signIn, signOut`.
- `src/app/api/auth/[...nextauth]/route.ts` — `export const { GET, POST } = handlers`.
- `src/app/(auth)/register/actions.ts` — `registerUser` server action: validate PAT
  via Octokit `GET /user`; reject if invalid; create user (hash pw, encrypt PAT,
  capture githubLogin/avatar); return result for client `signIn`.
- `src/lib/data/octokit-data-service.ts` — `OctokitDataService implements DataService`,
  constructed with `(pat, orgs)`; in-memory TTL cache (~60s) keyed by method+slug.
- `src/lib/data/get-data-service.ts` — `getDataService(): Promise<DataService>`:
  `auth()` → `store.getUserById` → `decryptPat` → `new OctokitDataService(...)`;
  redirect to `/login` if unauthenticated. `MockDataService` remains for dev/tests.
- `src/components/states/error-state.tsx` — `ErrorState({title, description, action?})`,
  mirrors `EmptyState` (aviation: a "signal lost" radar).

## 7. Auth flow

- **Register:** form (username, password, PAT) → `registerUser` action validates the
  PAT (`GET /user`), persists the user, then the client calls
  `signIn("credentials", {...})`.
- **Login:** form (username, password) → `signIn("credentials")`; `authorize` verifies
  the scrypt hash; Auth.js issues the JWT cookie.
- **Guard:** `(app)/layout.tsx` calls `auth()` server-side; no session →
  `redirect("/login")`. (Layout-level guard is robust regardless of Next 16
  middleware naming.)
- **Logout:** `signOut()` wired to the top-strip avatar (small menu) → returns to `/login`.

## 8. OctokitDataService mapping

`slug = owner/repo`; the service parses owner/repo for per-repo calls.

- `listRepositories` → `GET /user/repos` (affiliation owner+collaborator+org_member,
  paginated) merged with each configured org's `GET /orgs/{org}/repos`; dedup by full
  name; map to `Repository` (`id=full_name`, `name=repo`, `slug=full_name`,
  `defaultBranch`, `enabled=true`).
- `getMergeActivity` → Search API `repo:{full} is:pr is:merged merged:>={since}`;
  bucket merged PRs by day over 14 days.
- `getReleaseFrequency` → `GET /releases`; bucket by ISO week over ~7 weeks.
- `getDashboardSummary` (composed): `activePullRequests` = open-PR count;
  `openReleases` = draft-release count; `lastDeployment` = latest Deployment
  (best-effort) else latest release/default-branch commit; `buildHealthPct` = success
  rate of recent Actions runs (best-effort, else 100); `repositoryStatus` =
  `operational`, or `degraded` on partial API failure; `servicesOnline` = count of
  healthy environments (0 if none).
- `getEnvironmentStatuses` (best-effort) → `GET /environments` + latest deployment per
  env; if none, return empty (widgets already handle empty).
- `getDeploymentTimeline` (best-effort) → Deployment statuses over last 5 days; else empty.
- **Rate limits:** in-memory TTL cache (~60s) per method+slug; document GitHub limits.

## 9. Routing changes

- New `(auth)` route group + minimal `layout.tsx` (no dock/top-strip), with a
  VengeanceUI hero (`aurora-hero`/`liquid-gradient` — reserved for this in the Phase 1
  spec) over the cockpit aesthetic. Pages: `/login`, `/register`.
- `(app)/layout.tsx` gains the `auth()` guard.
- `dashboard/page.tsx` and the PR pages switch from the `data` singleton to
  `await getDataService()`. The repo store's hardcoded default gives way to the first
  real repo from `listRepositories`.

## 10. Error handling

- Invalid PAT at register → inline form error.
- Revoked PAT mid-session (GitHub 401) → redirect to `/login` with a notice.
- Rate limit (403) → `ErrorState` with a friendly message.
- Store read/write failure → surfaced, not swallowed.

## 11. Risk gates & staging

- **Gate 1:** install `next-auth@beta`; scaffold minimal config + route + a throwaway
  protected page; `next build` — confirm Auth.js builds on Next 16 / React 19 before
  building on it. Fallback: Approach A (hand-rolled sessions) from the brainstorm.
- **Gate 2:** validate a real PAT end-to-end (`GET /user`) before mapping all methods.
- **Stage A:** deps + crypto + Store + Auth.js config + login/register + guard
  (Octokit still mock) — independently verifiable (register/login/logout/redirect).
- **Stage B:** `OctokitDataService` + `getDataService` + wire dashboard/PR pages +
  `ErrorState`.

## 12. Success criteria

- `tsc --noEmit` and `next build` clean.
- Register validates the PAT and writes an encrypted user record to `.data/users.json`;
  the file contains no plaintext PAT.
- Login and logout work; unauthenticated `/dashboard` redirects to `/login`.
- Authenticated dashboard shows **real** repos, merge activity, and release frequency
  for the selected repo; env/timeline render real data when present, empty otherwise.
- PAT never appears in the client bundle, the JWT, or any cookie.
- Existing Phase 1 visuals/behavior unchanged for authenticated users.
