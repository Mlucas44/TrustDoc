/**
 * NextAuth Configuration & Helpers
 *
 * Provides authentication functionality with:
 * - Google OAuth sign-in
 * - Email magic link sign-in
 * - Prisma adapter for session storage
 * - Credit system integration
 *
 * Usage:
 * - Server Components: await auth()
 * - Server Actions: await signIn() / signOut()
 * - Client: useSession() from next-auth/react
 */

import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";

import { env } from "@/src/env";
import { prisma } from "@/src/lib/prisma";

// =============================================================================
// Type Extensions
// =============================================================================

/**
 * Extend NextAuth session to include userId and credits
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      credits: number;
    } & DefaultSession["user"];
  }

  interface User {
    credits: number;
  }
}

// =============================================================================
// NextAuth Configuration
// =============================================================================

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Session strategy: database sessions (recommended for serverless)
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  // Authentication providers
  providers: [
    // Google OAuth
    Google({
      clientId: env.server.GOOGLE_CLIENT_ID,
      clientSecret: env.server.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, // Link accounts with same email
    }),

    // Email magic links (only if SMTP is configured)
    ...(env.server.SMTP_HOST &&
    env.server.SMTP_PORT &&
    env.server.SMTP_USER &&
    env.server.SMTP_PASS &&
    env.server.EMAIL_FROM
      ? [
          Nodemailer({
            server: {
              host: env.server.SMTP_HOST,
              port: env.server.SMTP_PORT,
              auth: {
                user: env.server.SMTP_USER,
                pass: env.server.SMTP_PASS,
              },
            },
            from: env.server.EMAIL_FROM,
          }),
        ]
      : []),
  ],

  // Custom pages
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },

  // Callbacks
  callbacks: {
    // Include user ID and credits in session
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.credits = user.credits;
      }
      return session;
    },

    // Allow sign-in for all users
    async signIn() {
      return true;
    },
  },

  // Events
  events: {
    // Set default credits for new users
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { credits: 3 }, // 3 free credits for new users
      });
    },
  },

  // Debug mode in development
  debug: process.env.NODE_ENV === "development",
});
