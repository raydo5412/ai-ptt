import { PrismaAdapter } from "@auth/prisma-adapter";
import { type Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { env } from "@/env";
import { db } from "@/server/db";
import NextAuth, { type Session, type DefaultSession } from "next-auth";
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      hasAccess: boolean;
      location?: string;
      role: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    hasAccess: boolean;
    role: string;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.hasAccess = user.hasAccess;
        token.name = user.name;
        token.image = user.image;
        token.picture = user.image;
        token.location = (user as Session["user"]).location;
        token.role = user.role;
        token.isAdmin = user.role === "ADMIN";
      }

      // Handle updates
      if (trigger === "update" && (session as Session)?.user) {
        const user = await db.user.findUnique({
          where: { id: token.id as string },
        });
        console.log("Session", session, user);
        if (session) {
          token.name = (session as Session).user.name;
          token.image = (session as Session).user.image;
          token.picture = (session as Session).user.image;
          token.location = (session as Session).user.location;
          token.role = (session as Session).user.role;
          token.isAdmin = (session as Session).user.role === "ADMIN";
        }
        if (user) {
          token.hasAccess = user?.hasAccess ?? false;
          token.role = user.role;
          token.isAdmin = user.role === "ADMIN";
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.hasAccess = token.hasAccess as boolean;
      session.user.location = token.location as string;
      session.user.role = token.role as string;
      session.user.isAdmin = token.role === "ADMIN";
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const dbUser = await db.user.findUnique({
          where: { email: user.email! },
          select: { id: true, hasAccess: true, role: true },
        });

        if (dbUser) {
          user.hasAccess = dbUser.hasAccess;
          user.role = dbUser.role;
        } else {
          user.hasAccess = false;
          user.role = "USER";
        }
      }

      return true;
    },
  },

  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Mock Google",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.email === "test@example.com" &&
          credentials?.password === "test"
        ) {
          // 自動 upsert mock user
          await db.user.upsert({
            where: { id: "mock-user-id" },
            update: {},
            create: {
              id: "mock-user-id",
              name: "Mock User",
              email: "test@example.com",
              image: "https://i.pravatar.cc/150?img=3",
              hasAccess: true,
              role: "ADMIN",
              location: "Taipei"
            },
          });
          return {
            id: "mock-user-id",
            name: "Mock User",
            email: "test@example.com",
            image: "https://i.pravatar.cc/150?img=3",
            hasAccess: true,
            role: "ADMIN",
            location: "Taipei"
          };
        }
        return null;
      },
    }),
  ],
});
