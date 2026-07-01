export interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  passwordHash: string;
  patEncrypted: string;
  githubLogin: string;
  avatarUrl?: string;
  createdAt: string;
}

export type NewUser = Omit<User, "id" | "createdAt">;

export interface Invite {
  id: string;
  email: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface NewInvite {
  email: string;
  tokenHash: string;
  invitedBy: string;
  expiresAt: string;
}

export interface Store {
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  listUsers(): Promise<User[]>;
  createUser(input: NewUser): Promise<User>;
  updateUserPat(id: string, patEncrypted: string): Promise<void>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  updateUserAdmin(id: string, isAdmin: boolean): Promise<void>;
  deleteUser(id: string): Promise<void>;

  createInvite(input: NewInvite): Promise<Invite>;
  getInviteByTokenHash(tokenHash: string): Promise<Invite | null>;
  markInviteAccepted(id: string): Promise<void>;
  deletePendingInvitesForEmail(email: string): Promise<void>;
}
