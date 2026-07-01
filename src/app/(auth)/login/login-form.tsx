"use client";
import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useNavigationLoading } from "@/components/navigation-loading";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const { navigate } = useNavigationLoading();
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
    navigate("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-base font-medium">Sign in</h1>
      <Input name="username" placeholder="Username" autoComplete="username" required />
      <Input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
      {error && <p className="text-[12px] text-status-error">{error}</p>}
      <button type="submit" disabled={pending}
        className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-[12px] text-muted-foreground">
        No account? <Link href="/register" className="text-instrument hover:underline">Create one</Link>
      </p>
    </form>
  );
}
