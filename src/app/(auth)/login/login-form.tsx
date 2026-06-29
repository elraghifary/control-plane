"use client";
import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useNavigationLoading } from "@/components/navigation-loading";

export function LoginForm() {
  const { navigate, withLoading } = useNavigationLoading();
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    await withLoading(async () => {
      const res = await signIn("credentials", {
        username: String(fd.get("username")),
        password: String(fd.get("password")),
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid username or password.");
        return;
      }
      navigate("/dashboard");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h1 className="text-base font-medium">Sign in</h1>
      <input name="username" placeholder="Username" autoComplete="username" required
        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-instrument/60" />
      <input name="password" type="password" placeholder="Password" autoComplete="current-password" required
        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-instrument/60" />
      {error && <p className="text-[12px] text-status-error">{error}</p>}
      <button type="submit"
        className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
        Sign in
      </button>
      <p className="text-center text-[12px] text-muted-foreground">
        No account? <Link href="/register" className="text-instrument hover:underline">Create one</Link>
      </p>
    </form>
  );
}
