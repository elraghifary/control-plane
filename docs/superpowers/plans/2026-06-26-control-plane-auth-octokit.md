# Control Plane — Auth + Octokit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add username/password auth (Auth.js) with a per-user encrypted GitHub PAT, then serve real GitHub data through the existing `DataService` interface via Octokit.

**Architecture:** Auth.js v5 Credentials provider with a JWT session cookie; users + encrypted PAT persist in a local JSON store behind a `Store` interface. A server-only `getDataService()` factory decrypts the session user's PAT and builds an `OctokitDataService` that implements the unchanged Phase 1 `DataService`. The PAT never reaches the client.

**Tech Stack:** Next.js 16 (App Router), React 19, Auth.js v5 (`next-auth@beta`), `octokit`, Node built-in `crypto` (scrypt + AES-256-GCM + HKDF), Tailwind v4.

## Global Constraints

- **No test framework** (carried from Phase 1). Verification per task = `npx tsc --noEmit` + (where noted) `npx next build` + runtime/browser checks. Do **not** add a test runner or write unit tests.
- **Next.js 16 is not the Next you know** — confirm any unfamiliar API against `node_modules/next/dist/docs/` before using it. `cookies()`/`headers()` from `next/headers` are **async** (await them). `params`/`searchParams` are async.
- **The PAT is server-only.** It must never appear in a client component, the JWT/session payload, the cookie, or the client bundle. Only `crypto.ts`, the register action, `validate-pat.ts`, `get-data-service.ts`, and `octokit-data-service.ts` ever touch a raw PAT.
- **Secrets:** one env secret, `AUTH_SECRET`, used by Auth.js and (via HKDF) for PAT encryption. App must fail loudly if it is missing when encryption is needed.
- **Existing tokens only** for styling: `text-instrument`, `bg-status-*`, `text-foreground`, `bg-card`, `border-border`, etc. No hardcoded hex. Dark default; readable in light mode.
- **Do not modify** the `DataService` interface (`src/lib/data/data-service.ts`) or the domain types (`src/lib/data/types.ts`) except where a task explicitly says so. `MockDataService` stays for dev/tests.
- **`slug` is the GitHub `owner/repo` full name** in all Octokit code.
- Commit after each task. Match existing code style (2-space indent, double quotes, named exports).

## File Structure

**Create:**
- `src/lib/auth/crypto.ts` — scrypt hash/verify, AES-256-GCM encrypt/decrypt, HKDF key
- `src/lib/store/store.ts` — `User`, `NewUser`, `Store` types
- `src/lib/store/json-file-store.ts` — `JsonFileStore implements Store`
- `src/lib/store/index.ts` — `store` singleton + type re-exports
- `src/auth.ts` — Auth.js config (`handlers, auth, signIn, signOut`)
- `src/types/next-auth.d.ts` — session/JWT type augmentation
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handlers
- `src/lib/github/validate-pat.ts` — `validatePat` (Octokit `GET /user`)
- `src/app/(auth)/layout.tsx` — minimal auth shell (no dock)
- `src/app/(auth)/login/page.tsx` + `login-form.tsx`
- `src/app/(auth)/register/page.tsx` + `register-form.tsx` + `actions.ts`
- `src/lib/data/octokit-data-service.ts` — `OctokitDataService implements DataService`
- `src/lib/data/get-data-service.ts` — `getDataService()` factory
- `src/components/states/error-state.tsx` — `ErrorState`
- `.env.example` — documents `AUTH_SECRET`, `CONTROL_PLANE_GITHUB_ORGS`

**Modify:**
- `.gitignore` — add `.data/`
- `src/app/(app)/layout.tsx` — `auth()` guard + fetch repos for the selector
- `src/components/shell/top-strip.tsx` — accept `repos`/`selected`/user, render logout
- `src/components/shell/repo-selector.tsx` — take real repos as props + cookie-based selection
- `src/app/(app)/dashboard/page.tsx` — use `getDataService()` + cookie-selected repo

---

# Stage A — Auth & storage (Octokit still mock)

### Task 1: Dependencies, env, gitignore

**Files:**
- Modify: `package.json` (via npm), `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Produces: `next-auth` + `octokit` available; `AUTH_SECRET` in `.env.local`.

- [ ] **Step 1: Install dependencies**

Run: `npm install next-auth@beta octokit`
Expected: both added to `dependencies`; install exits 0.

- [ ] **Step 2: Generate the auth secret**

Run: `npx auth secret`
Expected: writes `AUTH_SECRET=...` to `.env.local` (gitignored by Next default). If it fails, run `echo "AUTH_SECRET=$(openssl rand -base64 33)" >> .env.local`.

- [ ] **Step 3: Add `.data/` to `.gitignore`**

Append to `.gitignore`:

```
# local auth/data store
.data/
```

- [ ] **Step 4: Create `.env.example`**

```
# Required: Auth.js session signing + PAT encryption key (HKDF-derived).
# Generate with: npx auth secret
AUTH_SECRET=

# Optional: comma-separated GitHub org logins to include in the repo list.
# Example: CONTROL_PLANE_GITHUB_ORGS=happykids,acme
CONTROL_PLANE_GITHUB_ORGS=
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (no source changes yet; confirms deps resolve).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore .env.example
git commit -m "chore(auth): add next-auth + octokit deps, env example, .data gitignore"
```

---

### Task 2: Crypto module

**Files:**
- Create: `src/lib/auth/crypto.ts`

**Interfaces:**
- Produces: `hashPassword(pw: string): string`, `verifyPassword(pw: string, stored: string): boolean`, `encryptPat(pat: string): string`, `decryptPat(payload: string): string`.

- [ ] **Step 1: Write `crypto.ts`**

```ts
import { scryptSync, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv, hkdfSync } from "node:crypto";

function patKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for PAT encryption");
  return Buffer.from(hkdfSync("sha256", secret, Buffer.alloc(0), "control-plane-pat-v1", 32));
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function encryptPat(pat: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", patKey(), iv);
  const enc = Buffer.concat([cipher.update(pat, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptPat(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted PAT");
  const decipher = createDecipheriv("aes-256-gcm", patKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. (Round-trip correctness is proven at runtime in Task 5: register encrypts, dashboard decrypts.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/crypto.ts
git commit -m "feat(auth): scrypt password hashing + AES-256-GCM PAT encryption"
```

---

### Task 3: User store

**Files:**
- Create: `src/lib/store/store.ts`, `src/lib/store/json-file-store.ts`, `src/lib/store/index.ts`

**Interfaces:**
- Produces: `User`, `NewUser`, `Store` types; `store: Store` singleton.
- `User = { id, username, passwordHash, patEncrypted, githubLogin, avatarUrl?, createdAt }`.
- `Store = { getUserByUsername, getUserById, createUser(NewUser), updateUserPat(id, patEncrypted) }`.

- [ ] **Step 1: Write `store.ts`**

```ts
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  patEncrypted: string;
  githubLogin: string;
  avatarUrl?: string;
  createdAt: string;
}

export type NewUser = Omit<User, "id" | "createdAt">;

export interface Store {
  getUserByUsername(username: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(input: NewUser): Promise<User>;
  updateUserPat(id: string, patEncrypted: string): Promise<void>;
}
```

- [ ] **Step 2: Write `json-file-store.ts`**

```ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Store, User, NewUser } from "./store";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "users.json");

export class JsonFileStore implements Store {
  private chain: Promise<unknown> = Promise.resolve();

  private async read(): Promise<User[]> {
    try {
      return JSON.parse(await fs.readFile(FILE, "utf8")) as User[];
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }

  private async write(users: User[]): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(users, null, 2), "utf8");
  }

  // Serialize all read-modify-write operations to avoid lost updates.
  private run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.chain.then(fn, fn);
    this.chain = result.then(() => undefined, () => undefined);
    return result;
  }

  getUserByUsername(username: string): Promise<User | null> {
    return this.run(async () =>
      (await this.read()).find((u) => u.username === username.toLowerCase()) ?? null
    );
  }

  getUserById(id: string): Promise<User | null> {
    return this.run(async () => (await this.read()).find((u) => u.id === id) ?? null);
  }

  createUser(input: NewUser): Promise<User> {
    return this.run(async () => {
      const users = await this.read();
      const username = input.username.toLowerCase();
      if (users.some((u) => u.username === username)) throw new Error("Username already exists");
      const user: User = { ...input, username, id: randomUUID(), createdAt: new Date().toISOString() };
      users.push(user);
      await this.write(users);
      return user;
    });
  }

  updateUserPat(id: string, patEncrypted: string): Promise<void> {
    return this.run(async () => {
      const users = await this.read();
      const user = users.find((u) => u.id === id);
      if (!user) throw new Error("User not found");
      user.patEncrypted = patEncrypted;
      await this.write(users);
    });
  }
}
```

- [ ] **Step 3: Write `index.ts`**

```ts
import { JsonFileStore } from "./json-file-store";
import type { Store } from "./store";

export const store: Store = new JsonFileStore();
export type { User, NewUser, Store } from "./store";
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store
git commit -m "feat(store): Store interface + JSON-file user store"
```

---

### Task 4: Auth.js config + route + risk gate

**Files:**
- Create: `src/auth.ts`, `src/types/next-auth.d.ts`, `src/app/api/auth/[...nextauth]/route.ts`

**Interfaces:**
- Consumes: `store` (Task 3), `verifyPassword` (Task 2).
- Produces: `auth()`, `signIn`, `signOut`, `handlers`. Session shape: `session.user.id`, `session.user.githubLogin?`, `session.user.avatarUrl?`.

- [ ] **Step 1: Write `src/types/next-auth.d.ts`**

```ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      githubLogin?: string;
      avatarUrl?: string;
    } & import("next-auth").DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    githubLogin?: string;
    avatarUrl?: string;
  }
}
```

- [ ] **Step 2: Write `src/auth.ts`**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { store } from "@/lib/store";
import { verifyPassword } from "@/lib/auth/crypto";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (creds) => {
        const username = String(creds?.username ?? "").toLowerCase();
        const password = String(creds?.password ?? "");
        if (!username || !password) return null;
        const user = await store.getUserByUsername(username);
        if (!user || !verifyPassword(password, user.passwordHash)) return null;
        return { id: user.id, name: user.githubLogin, image: user.avatarUrl ?? null };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.githubLogin = user.name ?? undefined;
        token.avatarUrl = user.image ?? undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
        session.user.githubLogin = token.githubLogin;
        session.user.avatarUrl = token.avatarUrl;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Write the route handler `src/app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 4: Verify (RISK GATE 1 — Auth.js on Next 16)**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx next build`
Expected: build succeeds with the new `/api/auth/[...nextauth]` route present. **If the build fails due to Auth.js/Next 16 incompatibility, STOP and report** — fall back to the brainstorm's Approach A (hand-rolled sessions). Peer deps declare `next ^16` support, so this is expected to pass.

- [ ] **Step 5: Commit**

```bash
git add src/auth.ts src/types/next-auth.d.ts "src/app/api/auth/[...nextauth]/route.ts"
git commit -m "feat(auth): Auth.js credentials config + route handler"
```

---

### Task 5: Registration (PAT validation + account creation)

**Files:**
- Create: `src/lib/github/validate-pat.ts`, `src/app/(auth)/register/actions.ts`, `src/app/(auth)/register/register-form.tsx`, `src/app/(auth)/register/page.tsx`
- Create: `src/app/(auth)/layout.tsx`

**Interfaces:**
- Consumes: `store`, `hashPassword`, `encryptPat`, `signIn`.
- Produces: `validatePat(pat): Promise<{login, avatarUrl?} | null>`; `registerUser(formData): Promise<{ok, error?}>`; the `(auth)` shell used by login too.

- [ ] **Step 1: Write `src/lib/github/validate-pat.ts`**

```ts
import { Octokit } from "octokit";

export interface GithubIdentity {
  login: string;
  avatarUrl?: string;
}

export async function validatePat(pat: string): Promise<GithubIdentity | null> {
  try {
    const octokit = new Octokit({ auth: pat });
    const { data } = await octokit.rest.users.getAuthenticated();
    return { login: data.login, avatarUrl: data.avatar_url };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Write `src/app/(auth)/register/actions.ts`**

```ts
"use server";
import { store } from "@/lib/store";
import { hashPassword, encryptPat } from "@/lib/auth/crypto";
import { validatePat } from "@/lib/github/validate-pat";

export interface RegisterResult {
  ok: boolean;
  error?: string;
}

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const pat = String(formData.get("pat") ?? "").trim();

  if (!username || !password || !pat) return { ok: false, error: "All fields are required." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const identity = await validatePat(pat);
  if (!identity) return { ok: false, error: "That GitHub token is invalid or lacks access." };

  try {
    await store.createUser({
      username,
      passwordHash: hashPassword(password),
      patEncrypted: encryptPat(pat),
      githubLogin: identity.login,
      avatarUrl: identity.avatarUrl,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create account." };
  }
}
```

- [ ] **Step 3: Write `src/app/(auth)/layout.tsx`** (shared minimal shell)

```tsx
import { GridField } from "@/components/motifs/grid-field";
import { ControlPlaneMark } from "@/components/brand/control-plane-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <GridField />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(700px 360px at 50% -10%, color-mix(in oklab, var(--instrument) 16%, transparent), transparent 60%)" }}
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-2">
          <ControlPlaneMark />
          <div className="leading-tight">
            <div className="text-sm font-medium">Control Plane</div>
            <div className="font-mono text-[10px] tracking-widest text-muted-foreground">OPS TOWER</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/app/(auth)/register/register-form.tsx`**

```tsx
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { registerUser } from "./actions";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await registerUser(fd);
    if (!res.ok) {
      setError(res.error ?? "Registration failed.");
      setPending(false);
      return;
    }
    const signin = await signIn("credentials", {
      username: String(fd.get("username")),
      password: String(fd.get("password")),
      redirect: false,
    });
    if (signin?.error) {
      setError("Account created, but sign-in failed. Try logging in.");
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h1 className="text-base font-medium">Create your account</h1>
      <input name="username" placeholder="Username" autoComplete="username" required
        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-instrument/60" />
      <input name="password" type="password" placeholder="Password (min 8 chars)" autoComplete="new-password" required
        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-instrument/60" />
      <input name="pat" type="password" placeholder="GitHub Personal Access Token" required
        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 font-mono text-xs outline-none focus:border-instrument/60" />
      <p className="text-[11px] text-muted-foreground">The token is encrypted at rest and used only on the server.</p>
      {error && <p className="text-[12px] text-status-error">{error}</p>}
      <button type="submit" disabled={pending}
        className="w-full rounded-lg bg-instrument/15 py-2 text-sm font-medium text-instrument ring-1 ring-instrument/40 transition-colors hover:bg-instrument/25 disabled:opacity-50">
        {pending ? "Creating…" : "Create account"}
      </button>
      <p className="text-center text-[12px] text-muted-foreground">
        Have an account? <Link href="/login" className="text-instrument hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 5: Write `src/app/(auth)/register/page.tsx`**

```tsx
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return <RegisterForm />;
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Runtime check: `npm run dev`, open `/register`, submit username + password + a **real** GitHub PAT.
Expected: redirected to `/dashboard` (it still renders the mock); then confirm the store:

Run: `cat .data/users.json`
Expected: one user; `patEncrypted` is `iv:tag:cipher` base64 (NOT your raw token); `passwordHash` is `salt:hash` hex. An invalid token shows the inline error and writes nothing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/github "src/app/(auth)/layout.tsx" "src/app/(auth)/register"
git commit -m "feat(auth): registration with PAT validation + encrypted account creation"
```

---

### Task 6: Login + logout

**Files:**
- Create: `src/app/(auth)/login/login-form.tsx`, `src/app/(auth)/login/page.tsx`
- Modify: `src/components/shell/top-strip.tsx`

**Interfaces:**
- Consumes: `signIn`, `signOut` (client from `next-auth/react`).
- Produces: working `/login`; a logout control in the top strip.

- [ ] **Step 1: Write `src/app/(auth)/login/login-form.tsx`**

```tsx
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      username: String(fd.get("username")),
      password: String(fd.get("password")),
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid username or password.");
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h1 className="text-base font-medium">Sign in</h1>
      <input name="username" placeholder="Username" autoComplete="username" required
        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-instrument/60" />
      <input name="password" type="password" placeholder="Password" autoComplete="current-password" required
        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-instrument/60" />
      {error && <p className="text-[12px] text-status-error">{error}</p>}
      <button type="submit" disabled={pending}
        className="w-full rounded-lg bg-instrument/15 py-2 text-sm font-medium text-instrument ring-1 ring-instrument/40 transition-colors hover:bg-instrument/25 disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-[12px] text-muted-foreground">
        No account? <Link href="/register" className="text-instrument hover:underline">Create one</Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Write `src/app/(auth)/login/page.tsx`**

```tsx
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return <LoginForm />;
}
```

- [ ] **Step 3: Add a logout control to the top strip**

In `src/components/shell/top-strip.tsx`, add `"use client"` is already present. Replace the avatar `<div>...ER...</div>` line with a logout-on-click button. Add at the top of the file:

```tsx
import { signOut } from "next-auth/react";
```

Replace:

```tsx
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-instrument to-instrument-2 text-xs font-medium text-background">ER</div>
```

with:

```tsx
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        title="Sign out"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-instrument to-instrument-2 text-xs font-medium text-background transition-opacity hover:opacity-80"
      >
        ER
      </button>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Runtime: `npm run dev`. At `/login`, sign in with the Task 5 account → lands on `/dashboard`. Click the avatar → returns to `/login`. Wrong password → inline error.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/login" src/components/shell/top-strip.tsx
git commit -m "feat(auth): login page + logout control"
```

---

### Task 7: Protect the (app) route group

**Files:**
- Modify: `src/app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `auth()` (Task 4).
- Produces: unauthenticated requests to any `(app)` route redirect to `/login`.

- [ ] **Step 1: Add the guard**

In `src/app/(app)/layout.tsx`, add imports and make the component async:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
```

Change the signature and add the guard as the first lines of the body:

```tsx
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
```

(Leave the rest of the JSX unchanged.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Runtime: in a logged-out browser (or after signing out), visit `/dashboard`, `/pull-requests`, `/releases`, `/settings` → each redirects to `/login`. After signing in, all render normally.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/layout.tsx"
git commit -m "feat(auth): require a session for all (app) routes"
```

---

# Stage B — Octokit data

### Task 8: OctokitDataService — repos, merge activity, releases

**Files:**
- Create: `src/lib/data/octokit-data-service.ts`

**Interfaces:**
- Consumes: `octokit`; `DataService` + domain types from `./data-service` / `./types`.
- Produces: `class OctokitDataService implements DataService` with a constructor `(pat: string, orgs?: string[])`; this task implements `listRepositories`, `getMergeActivity`, `getReleaseFrequency`. The remaining three methods are added in Task 9.

> NOTE: This file is only valid TypeScript once Task 9 adds the other three methods (an `implements DataService` class must implement all six). To keep `tsc` green between tasks, this task writes the **full class with all six methods**, but Task 9 owns the logic of the last three — here they return empty/zero stubs and are fleshed out in Task 9.

- [ ] **Step 1: Write `octokit-data-service.ts` (real: repos/merge/releases; stubs: summary/env/timeline)**

```ts
import { Octokit } from "octokit";
import type { DataService } from "./data-service";
import type {
  Repository, DashboardSummary, EnvironmentStatus,
  MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint,
} from "./types";

function parseSlug(slug: string): { owner: string; repo: string } {
  const [owner, repo] = slug.split("/");
  return { owner, repo };
}

export class OctokitDataService implements DataService {
  private octokit: Octokit;
  private orgs: string[];
  private cache = new Map<string, { at: number; value: unknown }>();
  private ttl = 60_000;

  constructor(pat: string, orgs: string[] = []) {
    this.octokit = new Octokit({ auth: pat });
    this.orgs = orgs;
  }

  private async cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.ttl) return hit.value as T;
    const value = await fn();
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }

  async listRepositories(): Promise<Repository[]> {
    return this.cached("repos", async () => {
      const own = await this.octokit.paginate(
        this.octokit.rest.repos.listForAuthenticatedUser,
        { per_page: 100, affiliation: "owner,collaborator,organization_member" }
      );
      const orgRepos = (
        await Promise.all(
          this.orgs.map((org) =>
            this.octokit
              .paginate(this.octokit.rest.repos.listForOrg, { org, per_page: 100 })
              .catch(() => [])
          )
        )
      ).flat();
      const byName = new Map<string, Repository>();
      for (const r of [...own, ...orgRepos]) {
        byName.set(r.full_name, {
          id: r.full_name,
          name: r.name,
          slug: r.full_name,
          enabled: true,
          defaultBranch: r.default_branch ?? "main",
        });
      }
      return [...byName.values()].sort((a, b) => a.slug.localeCompare(b.slug));
    });
  }

  async getMergeActivity(slug: string): Promise<MergeActivityPoint[]> {
    return this.cached(`merge:${slug}`, async () => {
      const since = new Date(Date.now() - 13 * 86400000);
      const sinceStr = since.toISOString().slice(0, 10);
      const res = await this.octokit.rest.search.issuesAndPullRequests({
        q: `repo:${slug} is:pr is:merged merged:>=${sinceStr}`,
        per_page: 100,
      });
      const buckets = new Map<string, number>();
      for (let i = 0; i < 14; i++) {
        buckets.set(new Date(since.getTime() + i * 86400000).toISOString().slice(5, 10), 0);
      }
      for (const item of res.data.items) {
        const key = (item.closed_at ?? "").slice(5, 10);
        if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
      return [...buckets.entries()].map(([date, merges]) => ({ date, merges }));
    });
  }

  async getReleaseFrequency(slug: string): Promise<ReleaseFrequencyPoint[]> {
    return this.cached(`rel:${slug}`, async () => {
      const { owner, repo } = parseSlug(slug);
      const releases = await this.octokit
        .paginate(this.octokit.rest.repos.listReleases, { owner, repo, per_page: 100 })
        .catch(() => []);
      const now = Date.now();
      const weeks: ReleaseFrequencyPoint[] = [];
      for (let w = 6; w >= 0; w--) {
        const start = now - (w + 1) * 7 * 86400000;
        const end = now - w * 7 * 86400000;
        const count = releases.filter((r) => {
          const t = new Date(r.published_at ?? r.created_at ?? 0).getTime();
          return t >= start && t < end;
        }).length;
        weeks.push({ period: `W${7 - w}`, count });
      }
      return weeks;
    });
  }

  // --- Implemented in Task 9 (stubbed here so `implements DataService` type-checks) ---
  async getDashboardSummary(_slug: string): Promise<DashboardSummary> {
    return {
      activePullRequests: 0, openReleases: 0,
      lastDeployment: { env: "main", ref: "main", sha: "—", deployedAt: new Date(0).toISOString(), status: "success" },
      repositoryStatus: "operational", servicesOnline: 0, buildHealthPct: 100,
    };
  }
  async getEnvironmentStatuses(_slug: string): Promise<EnvironmentStatus[]> {
    return [];
  }
  async getDeploymentTimeline(_slug: string): Promise<DeploymentTimelinePoint[]> {
    return [];
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors. (Octokit is fully typed — wrong method names/params fail here.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/octokit-data-service.ts
git commit -m "feat(data): OctokitDataService — repos, merge activity, release frequency"
```

---

### Task 9: OctokitDataService — summary, environments, timeline

**Files:**
- Modify: `src/lib/data/octokit-data-service.ts`

**Interfaces:**
- Produces: real `getDashboardSummary`, `getEnvironmentStatuses`, `getDeploymentTimeline` (best-effort; graceful empty).

- [ ] **Step 1: Replace the three stubbed methods**

Replace the block from `// --- Implemented in Task 9` through the end of `getDeploymentTimeline` with:

```ts
  async getDashboardSummary(slug: string): Promise<DashboardSummary> {
    return this.cached(`sum:${slug}`, async () => {
      const { owner, repo } = parseSlug(slug);
      const [openPrs, releases, runs] = await Promise.all([
        this.octokit.rest.search
          .issuesAndPullRequests({ q: `repo:${slug} is:pr is:open`, per_page: 1 })
          .then((r) => r.data.total_count)
          .catch(() => 0),
        this.octokit.rest.repos.listReleases({ owner, repo, per_page: 100 }).then((r) => r.data).catch(() => []),
        this.octokit.rest.actions
          .listWorkflowRunsForRepo({ owner, repo, per_page: 30 })
          .then((r) => r.data.workflow_runs)
          .catch(() => []),
      ]);
      const latest = releases[0];
      const completed = runs.filter((r) => r.status === "completed");
      const success = completed.filter((r) => r.conclusion === "success").length;
      const envs = await this.getEnvironmentStatuses(slug);
      return {
        activePullRequests: openPrs,
        openReleases: releases.filter((r) => r.draft).length,
        lastDeployment: {
          env: "main",
          ref: latest?.tag_name ?? "main",
          sha: (latest?.tag_name ?? "—").slice(0, 12),
          deployedAt: latest?.published_at ?? new Date(0).toISOString(),
          status: "success",
        },
        repositoryStatus: "operational",
        servicesOnline: envs.filter((e) => e.status === "healthy" || e.status === "stable").length,
        buildHealthPct: completed.length ? Math.round((success / completed.length) * 100) : 100,
      };
    });
  }

  async getEnvironmentStatuses(slug: string): Promise<EnvironmentStatus[]> {
    return this.cached(`env:${slug}`, async () => {
      const { owner, repo } = parseSlug(slug);
      const KNOWN: Record<string, EnvironmentStatus["env"]> = {
        development: "development", dev: "development",
        staging: "staging", stage: "staging",
        production: "main", prod: "main", main: "main",
      };
      const list = await this.octokit.rest.repos
        .getAllEnvironments({ owner, repo })
        .then((r) => r.data.environments ?? [])
        .catch(() => []);
      const out: EnvironmentStatus[] = [];
      for (const e of list) {
        const env = KNOWN[(e.name ?? "").toLowerCase()];
        if (!env || out.some((o) => o.env === env)) continue;
        out.push({
          env,
          status: "stable",
          openPRs: 0,
          lastDeployAt: e.updated_at ?? new Date(0).toISOString(),
          marker: e.name ?? env,
        });
      }
      return out;
    });
  }

  async getDeploymentTimeline(slug: string): Promise<DeploymentTimelinePoint[]> {
    return this.cached(`dep:${slug}`, async () => {
      const { owner, repo } = parseSlug(slug);
      const deps = await this.octokit.rest.repos
        .listDeployments({ owner, repo, per_page: 5 })
        .then((r) => r.data)
        .catch(() => []);
      return deps
        .slice(0, 5)
        .reverse()
        .map((_, i) => ({ day: `D${i + 1}`, status: "success" as const }));
    });
  }
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/octokit-data-service.ts
git commit -m "feat(data): OctokitDataService — summary, environments, timeline (best-effort)"
```

---

### Task 10: getDataService factory

**Files:**
- Create: `src/lib/data/get-data-service.ts`

**Interfaces:**
- Consumes: `auth()`, `store`, `decryptPat`, `OctokitDataService`.
- Produces: `getDataService(): Promise<DataService>` — server-only; redirects to `/login` if unauthenticated; throws if the user/PAT can't be loaded.

- [ ] **Step 1: Write `get-data-service.ts`**

```ts
import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { store } from "@/lib/store";
import { decryptPat } from "@/lib/auth/crypto";
import type { DataService } from "./data-service";
import { OctokitDataService } from "./octokit-data-service";

function orgs(): string[] {
  return (process.env.CONTROL_PLANE_GITHUB_ORGS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getDataService(): Promise<DataService> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await store.getUserById(session.user.id);
  if (!user) redirect("/login");
  return new OctokitDataService(decryptPat(user.patEncrypted), orgs());
}
```

> If `server-only` is not already a dependency, install it: `npm install server-only`. (It ships with Next; if the import errors at build, add the package.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/get-data-service.ts package.json package-lock.json
git commit -m "feat(data): server-only getDataService factory (session PAT -> Octokit)"
```

---

### Task 11: Wire the dashboard + repo selection to real data

**Files:**
- Modify: `src/app/(app)/layout.tsx`, `src/components/shell/top-strip.tsx`, `src/components/shell/repo-selector.tsx`, `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getDataService`, `cookies()` from `next/headers`.
- Produces: the selector lists real repos; selection persists in a `cp-repo` cookie (server-readable); the dashboard renders data for the selected repo.

- [ ] **Step 1: Fetch repos in the layout and pass them down**

In `src/app/(app)/layout.tsx`, after the auth guard, add (above the `return`):

```tsx
  const { getDataService } = await import("@/lib/data/get-data-service");
  const { cookies } = await import("next/headers");
  const data = await getDataService();
  const repos = await data.listRepositories();
  const selected = (await cookies()).get("cp-repo")?.value ?? repos[0]?.slug ?? "";
```

Then change `<TopStrip />` to:

```tsx
        <TopStrip repos={repos} selected={selected} />
```

- [ ] **Step 2: Update `TopStrip` to accept and forward the repo props**

In `src/components/shell/top-strip.tsx`, change the import of `Repository` and the signature:

```tsx
import type { Repository } from "@/lib/data";
```

```tsx
export function TopStrip({ repos, selected }: { repos: Repository[]; selected: string }) {
```

Replace `<RepoSelector />` with:

```tsx
      <RepoSelector repos={repos} selected={selected} />
```

- [ ] **Step 3: Make `RepoSelector` use real repos + a cookie**

Replace the body of `src/components/shell/repo-selector.tsx` with a props-driven version (drops the `REPOS` fixture import and the zustand store; selection writes the `cp-repo` cookie and refreshes):

```tsx
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Folder, ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Repository } from "@/lib/data";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { cn } from "@/lib/utils";

export function RepoSelector({ repos, selected }: { repos: Repository[]; selected: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

  const current = repos.find((r) => r.slug === selected)?.name ?? "Select repo";

  function choose(slug: string) {
    document.cookie = `cp-repo=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-sm text-foreground/80 backdrop-blur transition-colors hover:border-instrument/40"
      >
        <Folder className="h-4 w-4 text-instrument" />
        <span className="text-muted-foreground">Repository</span>
        <span className="font-mono font-medium text-foreground">{current}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 mt-2 max-h-72 w-64 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-xl"
          >
            {repos.length === 0 && (
              <li className="px-2.5 py-2 text-xs text-muted-foreground">No repositories found for this token.</li>
            )}
            {repos.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => choose(r.slug)}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-accent"
                >
                  <span className="font-mono">{r.slug}</span>
                  {r.slug === selected && <Check className="h-3.5 w-3.5 text-instrument" />}
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

> This removes the last consumer of `src/lib/store/use-repo-store.ts`. Delete that now-orphaned file: `git rm src/lib/store/use-repo-store.ts`.

- [ ] **Step 4: Read the selected repo in the dashboard page**

Replace `src/app/(app)/dashboard/page.tsx` with:

```tsx
import { cookies } from "next/headers";
import { getDataService } from "@/lib/data/get-data-service";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { EmptyState } from "@/components/states/empty-state";

export default async function DashboardPage() {
  const data = await getDataService();
  const repos = await data.listRepositories();
  const cookieSlug = (await cookies()).get("cp-repo")?.value;
  const slug = repos.find((r) => r.slug === cookieSlug)?.slug ?? repos[0]?.slug;

  if (!slug) {
    return <EmptyState title="No repositories" description="This GitHub token can't see any repositories yet." />;
  }

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

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors (and no remaining import of `use-repo-store`).

Runtime: `npm run dev`, sign in. The repo selector lists your real GitHub repos (personal + any configured org). Pick one → dashboard reloads with that repo's real Active PRs, Merge Activity, and Release Frequency. Env/timeline show data when the repo uses GitHub Environments/Deployments, otherwise render empty.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/layout.tsx" src/components/shell/top-strip.tsx src/components/shell/repo-selector.tsx "src/app/(app)/dashboard/page.tsx" src/lib/store/use-repo-store.ts
git commit -m "feat(data): wire dashboard + repo selector to live GitHub via getDataService"
```

---

### Task 12: ErrorState + revoked-token handling + final verification

**Files:**
- Create: `src/components/states/error-state.tsx`
- Modify: `src/lib/data/get-data-service.ts`, `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Produces: `ErrorState({title, description?, action?})`; a revoked/invalid PAT mid-session surfaces cleanly instead of crashing.

- [ ] **Step 1: Write `src/components/states/error-state.tsx`**

```tsx
import { RadarRings } from "@/components/motifs/radar-rings";

export function ErrorState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-status-error/40 px-6 py-16 text-center">
      <div className="opacity-70 text-status-error"><RadarRings size={96} /></div>
      <h3 className="mt-4 text-base font-medium text-status-error">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Catch GitHub auth failures in the dashboard**

In `src/app/(app)/dashboard/page.tsx`, wrap the data loads. Add the import:

```tsx
import { ErrorState } from "@/components/states/error-state";
```

Wrap the `listRepositories` + `Promise.all` region in try/catch; on a 401 (revoked PAT) redirect to login, otherwise show `ErrorState`:

```tsx
  let slug: string | undefined;
  let payload;
  try {
    const repos = await data.listRepositories();
    const cookieSlug = (await cookies()).get("cp-repo")?.value;
    slug = repos.find((r) => r.slug === cookieSlug)?.slug ?? repos[0]?.slug;
    if (!slug) {
      return <EmptyState title="No repositories" description="This GitHub token can't see any repositories yet." />;
    }
    const [summary, envs, merge, release, timeline] = await Promise.all([
      data.getDashboardSummary(slug),
      data.getEnvironmentStatuses(slug),
      data.getMergeActivity(slug),
      data.getReleaseFrequency(slug),
      data.getDeploymentTimeline(slug),
    ]);
    payload = { summary, envs, merge, release, timeline };
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401) redirect("/login");
    return (
      <ErrorState
        title="Couldn't reach GitHub"
        description={status === 403 ? "GitHub rate limit hit — try again shortly." : "The GitHub API request failed. Check your token in settings."}
      />
    );
  }
  return <DashboardView {...payload} />;
```

Add `import { redirect } from "next/navigation";` at the top. (Remove the old un-wrapped `Promise.all`/return from Task 11 so only this version remains.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx next build`
Expected: build succeeds, 0 errors.

Runtime: sign in → dashboard shows real data. Then simulate a bad token: stop dev, edit `.data/users.json` to corrupt the `patEncrypted` value, restart, reload `/dashboard` → you see the `ErrorState` (or a redirect to `/login`), not a crash. Restore the file afterward.

- [ ] **Step 4: Commit**

```bash
git add src/components/states/error-state.tsx "src/app/(app)/dashboard/page.tsx"
git commit -m "feat(ux): ErrorState + graceful handling of GitHub auth/rate-limit failures"
```

---

## Self-Review

**Spec coverage:**
- Username/password + PAT accounts → Tasks 2–6. ✓
- Auth.js v5 Credentials + JWT session → Task 4. ✓
- PAT encrypted (AES-256-GCM, HKDF from AUTH_SECRET) → Task 2; used in Task 5. ✓
- Store abstraction + JSON file (.data, gitignored) → Tasks 1, 3. ✓
- Registration validates PAT against GitHub → Task 5. ✓
- Login + logout → Task 6. ✓
- Route protection (redirect to /login) → Task 7. ✓
- OctokitDataService implements DataService; repos/PRs/releases real, env/timeline best-effort → Tasks 8, 9. ✓
- Repos from both user + org, deduped, slug=owner/repo → Task 8. ✓
- getDataService server-only factory (session PAT → Octokit) → Task 10. ✓
- Wire dashboard + functional repo selector → Task 11. ✓
- Error handling (revoked PAT, rate limit) + ErrorState → Task 12. ✓
- Success criteria (tsc/build clean, encrypted-at-rest, redirect, real data, PAT never client-side) → Tasks 4, 5, 7, 11, 12. ✓
- Risk gate (Auth.js on Next 16) → Task 4 Step 4. ✓

**Placeholder scan:** Every code step shows complete code. The Task 8 stubs are intentional and explicitly replaced in Task 9 (full code given). No "TBD"/"similar to". ✓

**Type consistency:** `Store`/`User`/`NewUser` match across Tasks 3–5 and 10. `getDataService(): Promise<DataService>` matches consumers in Tasks 11–12. `OctokitDataService(pat, orgs?)` constructor matches Task 10's call. `RepoSelector({repos, selected})` / `TopStrip({repos, selected})` match the Task 11 layout call. Session shape `session.user.id` (Task 4 augmentation) matches Task 10 usage. `slug=owner/repo` consistent across Tasks 8–11. ✓

**Orphans:** Task 11 removes `use-repo-store.ts` (its only consumer) — handled with `git rm`. `MockDataService`/`data` export retained for dev/tests (not orphaned). ✓
