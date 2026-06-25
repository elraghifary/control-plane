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
