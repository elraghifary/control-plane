import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { store } from "@/lib/store";
import { verifyPassword } from "@/lib/auth/crypto";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (creds) => {
        const username = String(creds?.username ?? "").toLowerCase();
        const password = String(creds?.password ?? "");
        if (!username || !password) return null;
        const user = await store.getUserByUsername(username);
        if (!user || !verifyPassword(password, user.passwordHash)) return null;
        return { id: user.id, name: user.githubLogin, image: user.avatarUrl ?? null };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.githubLogin = user.name ?? undefined;
        token.avatarUrl = user.image ?? undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
        session.user.githubLogin = token.githubLogin;
        session.user.avatarUrl = token.avatarUrl;
      }
      return session;
    },
  },
});
