import { Pool, type QueryResultRow } from "pg";
import type { Store, User, NewUser, Invite, NewInvite } from "./store";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DB_CONTROL_PLANE;
  if (!connectionString) throw new Error("Missing DB_CONTROL_PLANE");
  pool = new Pool({ connectionString });
  return pool;
}

function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return getPool().query<T>(text, params);
}

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  is_admin: boolean;
  password_hash: string;
  pat_encrypted: string;
  github_login: string;
  avatar_url: string | null;
  created_at: string;
}

interface InviteRow extends QueryResultRow {
  id: string;
  email: string;
  token_hash: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    isAdmin: row.is_admin,
    passwordHash: row.password_hash,
    patEncrypted: row.pat_encrypted,
    githubLogin: row.github_login,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
  };
}

function toInvite(row: InviteRow): Invite {
  return {
    id: row.id,
    email: row.email,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? undefined,
  };
}

export class PgStore implements Store {
  async getUserByEmail(email: string): Promise<User | null> {
    const res = await query<UserRow>("select * from users where email = $1", [email.toLowerCase()]);
    return res.rows[0] ? toUser(res.rows[0]) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const res = await query<UserRow>("select * from users where id = $1", [id]);
    return res.rows[0] ? toUser(res.rows[0]) : null;
  }

  async listUsers(): Promise<User[]> {
    const res = await query<UserRow>("select * from users order by created_at asc");
    return res.rows.map(toUser);
  }

  async createUser(input: NewUser): Promise<User> {
    try {
      const res = await query<UserRow>(
        `insert into users (email, is_admin, password_hash, pat_encrypted, github_login, avatar_url)
         values ($1, $2, $3, $4, $5, $6)
         returning *`,
        [input.email.toLowerCase(), input.isAdmin, input.passwordHash, input.patEncrypted, input.githubLogin, input.avatarUrl ?? null],
      );
      return toUser(res.rows[0]);
    } catch (e) {
      if (e instanceof Error && "code" in e && (e as { code?: string }).code === "23505") {
        throw new Error("Email already exists");
      }
      throw e;
    }
  }

  async updateUserPat(id: string, patEncrypted: string): Promise<void> {
    await query("update users set pat_encrypted = $1 where id = $2", [patEncrypted, id]);
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    await query("update users set password_hash = $1 where id = $2", [passwordHash, id]);
  }

  async updateUserAdmin(id: string, isAdmin: boolean): Promise<void> {
    await query("update users set is_admin = $1 where id = $2", [isAdmin, id]);
  }

  async deleteUser(id: string): Promise<void> {
    await query("delete from users where id = $1", [id]);
  }

  async createInvite(input: NewInvite): Promise<Invite> {
    const res = await query<InviteRow>(
      `insert into invites (email, token_hash, invited_by, expires_at)
       values ($1, $2, $3, $4)
       returning *`,
      [input.email.toLowerCase(), input.tokenHash, input.invitedBy, input.expiresAt],
    );
    return toInvite(res.rows[0]);
  }

  async getInviteByTokenHash(tokenHash: string): Promise<Invite | null> {
    const res = await query<InviteRow>("select * from invites where token_hash = $1", [tokenHash]);
    return res.rows[0] ? toInvite(res.rows[0]) : null;
  }

  async markInviteAccepted(id: string): Promise<void> {
    await query("update invites set accepted_at = now() where id = $1", [id]);
  }

  async deletePendingInvitesForEmail(email: string): Promise<void> {
    await query("delete from invites where email = $1 and accepted_at is null", [email.toLowerCase()]);
  }
}
