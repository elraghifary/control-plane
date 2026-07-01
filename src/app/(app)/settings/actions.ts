"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { store } from "@/lib/store";
import { hashPassword, verifyPassword, encryptPat } from "@/lib/auth/crypto";
import { validatePat } from "@/lib/github/validate-pat";
import { generateInviteToken, hashInviteToken, INVITE_TTL_MS } from "@/lib/auth/invite-token";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isAdmin) return null;
  return session;
}

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

export async function inviteUserAction(email: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not authorized." };

  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return { ok: false, error: "Enter a valid email address." };

  const existing = await store.getUserByEmail(normalized);
  if (existing) return { ok: false, error: "A user with this email already exists." };

  const token = generateInviteToken();
  await store.deletePendingInvitesForEmail(normalized);
  await store.createInvite({
    email: normalized,
    tokenHash: hashInviteToken(token),
    invitedBy: session.user.id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  });
  return { ok: true, token };
}

export async function updateUserAdminAction(userId: string, isAdmin: boolean): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not authorized." };
  if (userId === session.user.id) return { ok: false, error: "You can't change your own admin status." };

  if (!isAdmin) {
    const users = await store.listUsers();
    const target = users.find((u) => u.id === userId);
    const adminCount = users.filter((u) => u.isAdmin).length;
    if (target?.isAdmin && adminCount <= 1) return { ok: false, error: "Can't remove the last admin." };
  }

  await store.updateUserAdmin(userId, isAdmin);
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteUserAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Not authorized." };
  if (userId === session.user.id) return { ok: false, error: "You can't remove your own account." };

  await store.deleteUser(userId);
  revalidatePath("/settings");
  return { ok: true };
}
