"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword, changeGithubPat } from "./actions";

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/50 p-5 backdrop-blur">
      <div className="mb-4 border-b border-border/50 pb-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function StatusMessage({ result }: { result: { ok: boolean; error?: string } | null }) {
  if (!result) return null;
  if (result.ok) return <p className="text-xs text-status-healthy">Saved successfully.</p>;
  return <p className="text-xs text-status-error">{result.error}</p>;
}

export function ChangePasswordForm() {
  const [result, setResult] = React.useState<{ ok: boolean; error?: string } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await changePassword(new FormData(e.currentTarget));
    setResult(res);
    setLoading(false);
    if (res.ok) formRef.current?.reset();
  }

  return (
    <SettingsSection title="Change Password" description="Update your login password.">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <Input name="currentPassword" type="password" placeholder="Current password" autoComplete="current-password" required />
        <Input name="newPassword" type="password" placeholder="New password (min 8 chars)" autoComplete="new-password" required />
        <Input name="confirmPassword" type="password" placeholder="Confirm new password" autoComplete="new-password" required />
        <StatusMessage result={result} />
        <Button
          type="submit"
          size="sm"
          loading={loading}
          className="rounded-full"
        >
          {loading ? "Saving…" : "Update Password"}
        </Button>
      </form>
    </SettingsSection>
  );
}

export function ChangePatForm({ githubLogin }: { githubLogin?: string }) {
  const [result, setResult] = React.useState<{ ok: boolean; error?: string } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await changeGithubPat(new FormData(e.currentTarget));
    setResult(res);
    setLoading(false);
    if (res.ok) formRef.current?.reset();
  }

  return (
    <SettingsSection
      title="GitHub Personal Access Token"
      description="The token is encrypted at rest and used only on the server to read and write GitHub data."
    >
      {githubLogin && (
        <p className="mb-3 font-mono text-xs text-muted-foreground">Connected as {githubLogin}</p>
      )}
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <Input name="pat" type="password" placeholder="ghp_… or github_pat_…" autoComplete="off" required />
        <p className="text-[11px] text-muted-foreground">
          Needs <code className="font-mono">repo</code> and <code className="font-mono">read:org</code> scopes.
        </p>
        <StatusMessage result={result} />
        <Button
          type="submit"
          size="sm"
          loading={loading}
          className="rounded-full"
        >
          {loading ? "Validating…" : "Update Token"}
        </Button>
      </form>
    </SettingsSection>
  );
}
