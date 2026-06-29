"use server";

import { auth } from "@/auth";
import { store } from "@/lib/store";
import { hashPassword, verifyPassword, encryptPat } from "@/lib/auth/crypto";
import { validatePat } from "@/lib/github/validate-pat";

export async function changePassword(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword) return { ok: false, error: "All fields are required." };
  if (newPassword.length < 8) return { ok: false, error: "New password must be at least 8 characters." };
  if (newPassword !== confirmPassword) return { ok: false, error: "Passwords do not match." };

  const user = await store.getUserById(session.user.id);
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    return { ok: false, error: "Current password is incorrect." };
  }

  await store.updateUserPassword(session.user.id, hashPassword(newPassword));
  return { ok: true };
}

export async function changeGithubPat(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated." };

  const pat = String(formData.get("pat") ?? "").trim();
  if (!pat) return { ok: false, error: "GitHub PAT is required." };

  const identity = await validatePat(pat);
  if (!identity) return { ok: false, error: "Invalid GitHub token — authentication failed." };

  await store.updateUserPat(session.user.id, encryptPat(pat));
  return { ok: true };
}
