/**
 * Environment Variables Print Script
 *
 * This script prints all environment variables (public keys and placeholders for secrets).
 * Useful for debugging configuration issues without exposing sensitive data.
 *
 * Usage:
 *   pnpm env:print
 */

import { resolve } from "path";

import { config } from "dotenv";

// Load .env.local (local development) or .env (fallback)
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// Dynamic import to ensure dotenv loads first
(async () => {
  const { env } = await import("../src/env");

  console.log("=== TrustDoc Environment Variables ===\n");

  console.log("📱 Client Variables (Public):");
  console.log("  NEXT_PUBLIC_APP_URL:", env.client.NEXT_PUBLIC_APP_URL);
  console.log("  NEXT_PUBLIC_SUPABASE_URL:", env.client.NEXT_PUBLIC_SUPABASE_URL);
  console.log(
    "  NEXT_PUBLIC_SUPABASE_ANON_KEY:",
    env.client.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + "..."
  );
  console.log(
    "  NEXT_PUBLIC_STRIPE_PUBLIC_KEY:",
    env.client.NEXT_PUBLIC_STRIPE_PUBLIC_KEY.substring(0, 15) + "..."
  );

  console.log("\n🔒 Server Variables (Private):");
  console.log("  NODE_ENV:", env.server.NODE_ENV);
  console.log("  NEXTAUTH_URL:", env.server.NEXTAUTH_URL);
  console.log("  NEXTAUTH_SECRET: [HIDDEN - " + env.server.NEXTAUTH_SECRET.length + " chars]");
  console.log("  GOOGLE_CLIENT_ID:", env.server.GOOGLE_CLIENT_ID.substring(0, 20) + "...");
  console.log("  GOOGLE_CLIENT_SECRET: [HIDDEN]");
  console.log("  SUPABASE_SERVICE_ROLE_KEY: [HIDDEN]");
  console.log("  OPENAI_API_KEY: [HIDDEN]");
  console.log("  OLLAMA_BASE_URL:", env.server.OLLAMA_BASE_URL || "[NOT SET]");
  console.log("  STRIPE_SECRET_KEY:", env.server.STRIPE_SECRET_KEY.substring(0, 10) + "...");
  console.log(
    "  STRIPE_WEBHOOK_SECRET:",
    env.server.STRIPE_WEBHOOK_SECRET.substring(0, 10) + "..."
  );
  console.log("  RATE_LIMIT_WINDOW:", env.server.RATE_LIMIT_WINDOW + "s");
  console.log("  RATE_LIMIT_MAX:", env.server.RATE_LIMIT_MAX + " requests");

  console.log("\n✅ All variables validated successfully!");
  process.exit(0);
})();
