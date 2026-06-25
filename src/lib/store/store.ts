export interface User {
  id: string;
  username: string;
  passwordHash: string;
  patEncrypted: string;
  githubLogin: string;
  avatarUrl?: string;
  createdAt: string;
}

export type NewUser = Omit<User, "id" | "createdAt">;

export interface Store {
  getUserByUsername(username: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(input: NewUser): Promise<User>;
  updateUserPat(id: string, patEncrypted: string): Promise<void>;
}
