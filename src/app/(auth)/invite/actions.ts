"use server";

import { store } from "@/lib/store";
import { hashPassword, encryptPat } from "@/lib/auth/crypto";
import { hashInviteToken } from "@/lib/auth/invite-token";
import { validatePat } from "@/lib/github/validate-pat";

export interface AcceptInviteResult {
  ok: boolean;
  error?: string;
}

export async function acceptInvite(token: string, formData: FormData): Promise<AcceptInviteResult> {
  const invite = await store.getInviteByTokenHash(hashInviteToken(token));
  if (!invite || invite.acceptedAt || new Date(invite.expiresAt) < new Date()) {
    return { ok: false, error: "This invite link is invalid or has expired." };
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const pat = String(formData.get("pat") ?? "").trim();

  if (!password || !pat) return { ok: false, error: "All fields are required." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { ok: false, error: "Passwords do not match." };

  const identity = await validatePat(pat);
  if (!identity) return { ok: false, error: "That GitHub token is invalid or lacks access." };

  try {
    await store.createUser({
      email: invite.email,
      isAdmin: false,
      passwordHash: hashPassword(password),
      patEncrypted: encryptPat(pat),
      githubLogin: identity.login,
      avatarUrl: identity.avatarUrl,
    });
    await store.markInviteAccepted(invite.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create account." };
  }
}
