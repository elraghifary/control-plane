import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Store, User, NewUser, Invite, NewInvite } from "./store";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function toUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    isAdmin: row.is_admin as boolean,
    passwordHash: row.password_hash as string,
    patEncrypted: row.pat_encrypted as string,
    githubLogin: row.github_login as string,
    avatarUrl: (row.avatar_url as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

function toInvite(row: Record<string, unknown>): Invite {
  return {
    id: row.id as string,
    email: row.email as string,
    invitedBy: row.invited_by as string,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
    acceptedAt: (row.accepted_at as string | null) ?? undefined,
  };
}

export class SupabaseStore implements Store {
  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await getClient()
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data ? toUser(data) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await getClient()
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toUser(data) : null;
  }

  async listUsers(): Promise<User[]> {
    const { data, error } = await getClient()
      .from("users")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toUser);
  }

  async createUser(input: NewUser): Promise<User> {
    const email = input.email.toLowerCase();
    const { data, error } = await getClient()
      .from("users")
      .insert({
        id: randomUUID(),
        email,
        is_admin: input.isAdmin,
        password_hash: input.passwordHash,
        pat_encrypted: input.patEncrypted,
        github_login: input.githubLogin,
        avatar_url: input.avatarUrl ?? null,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Email already exists");
      throw error;
    }
    return toUser(data);
  }

  async updateUserPat(id: string, patEncrypted: string): Promise<void> {
    const { error } = await getClient()
      .from("users")
      .update({ pat_encrypted: patEncrypted })
      .eq("id", id);
    if (error) throw error;
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    const { error } = await getClient()
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", id);
    if (error) throw error;
  }

  async updateUserAdmin(id: string, isAdmin: boolean): Promise<void> {
    const { error } = await getClient()
      .from("users")
      .update({ is_admin: isAdmin })
      .eq("id", id);
    if (error) throw error;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await getClient().from("users").delete().eq("id", id);
    if (error) throw error;
  }

  async createInvite(input: NewInvite): Promise<Invite> {
    const { data, error } = await getClient()
      .from("invites")
      .insert({
        id: randomUUID(),
        email: input.email.toLowerCase(),
        token_hash: input.tokenHash,
        invited_by: input.invitedBy,
        created_at: new Date().toISOString(),
        expires_at: input.expiresAt,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toInvite(data);
  }

  async getInviteByTokenHash(tokenHash: string): Promise<Invite | null> {
    const { data, error } = await getClient()
      .from("invites")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error) throw error;
    return data ? toInvite(data) : null;
  }

  async markInviteAccepted(id: string): Promise<void> {
    const { error } = await getClient()
      .from("invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  }

  async deletePendingInvitesForEmail(email: string): Promise<void> {
    const { error } = await getClient()
      .from("invites")
      .delete()
      .eq("email", email.toLowerCase())
      .is("accepted_at", null);
    if (error) throw error;
  }
}
