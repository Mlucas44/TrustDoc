/**
 * NextAuth API Route Handler
 *
 * This route handles all authentication requests:
 * - /api/auth/signin - Sign-in page
 * - /api/auth/signout - Sign-out
 * - /api/auth/callback/google - Google OAuth callback
 * - /api/auth/callback/email - Email verification
 * - /api/auth/session - Get current session
 * - etc.
 *
 * @see https://next-auth.js.org/configuration/initialization#route-handlers-app
 */

import { handlers } from "@/src/auth";

export const { GET, POST } = handlers;
