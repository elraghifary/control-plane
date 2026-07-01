"use client";
import * as React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { registerUser } from "./actions";
import { useNavigationLoading } from "@/components/navigation-loading";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const { navigate, withLoading } = useNavigationLoading();
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    await withLoading(async () => {
      const res = await registerUser(fd);
      if (!res.ok) {
        setError(res.error ?? "Registration failed.");
        return;
      }
      const signin = await signIn("credentials", {
        username: String(fd.get("username")),
        password: String(fd.get("password")),
        redirect: false,
      });
      if (signin?.error) {
        setError("Account created, but sign-in failed. Try logging in.");
        return;
      }
      navigate("/dashboard");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-base font-medium">Create your account</h1>
      <Input name="username" placeholder="Username" autoComplete="username" required />
      <Input name="password" type="password" placeholder="Password (min 8 chars)" autoComplete="new-password" required />
      <Input name="pat" type="password" placeholder="GitHub Personal Access Token" required className="font-mono text-xs" />
      <p className="text-[11px] text-muted-foreground">The token is encrypted at rest and used only on the server.</p>
      {error && <p className="text-[12px] text-status-error">{error}</p>}
      <button type="submit"
        className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
        Create account
      </button>
      <p className="text-center text-[12px] text-muted-foreground">
        Have an account? <Link href="/login" className="text-instrument hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
