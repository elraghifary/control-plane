import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Store, User, NewUser } from "./store";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "users.json");

export class JsonFileStore implements Store {
  private chain: Promise<unknown> = Promise.resolve();

  private async read(): Promise<User[]> {
    try {
      return JSON.parse(await fs.readFile(FILE, "utf8")) as User[];
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }

  private async write(users: User[]): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(users, null, 2), "utf8");
  }

  // Serialize all read-modify-write operations to avoid lost updates.
  private run<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.chain.then(fn, fn);
    this.chain = result.then(() => undefined, () => undefined);
    return result;
  }

  getUserByUsername(username: string): Promise<User | null> {
    return this.run(async () =>
      (await this.read()).find((u) => u.username === username.toLowerCase()) ?? null
    );
  }

  getUserById(id: string): Promise<User | null> {
    return this.run(async () => (await this.read()).find((u) => u.id === id) ?? null);
  }

  createUser(input: NewUser): Promise<User> {
    return this.run(async () => {
      const users = await this.read();
      const username = input.username.toLowerCase();
      if (users.some((u) => u.username === username)) throw new Error("Username already exists");
      const user: User = { ...input, username, id: randomUUID(), createdAt: new Date().toISOString() };
      users.push(user);
      await this.write(users);
      return user;
    });
  }

  updateUserPat(id: string, patEncrypted: string): Promise<void> {
    return this.run(async () => {
      const users = await this.read();
      const user = users.find((u) => u.id === id);
      if (!user) throw new Error("User not found");
      user.patEncrypted = patEncrypted;
      await this.write(users);
    });
  }
}
