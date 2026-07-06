import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { store } from "@/lib/store";
import { verifyPassword } from "@/lib/auth/crypto";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await store.getUserByEmail(email);
        if (!user || !verifyPassword(password, user.passwordHash)) return null;
        return { id: user.id, name: user.githubLogin, image: user.avatarUrl ?? null, isAdmin: user.isAdmin };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.githubLogin = user.name ?? undefined;
        token.avatarUrl = user.image ?? undefined;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
        session.user.githubLogin = token.githubLogin;
        session.user.avatarUrl = token.avatarUrl;
        session.user.isAdmin = token.isAdmin ?? false;
      }
      return session;
    },
  },
});
