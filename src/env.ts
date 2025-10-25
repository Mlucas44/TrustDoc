import { z } from "zod";

/**
 * Environment Variables Schema & Validation
 *
 * This file provides type-safe access to environment variables with runtime validation.
 * Variables are split into two categories:
 * - server: Private variables (never exposed to the client)
 * - client: Public variables (prefixed with NEXT_PUBLIC_)
 *
 * @see docs/ENVIRONMENT_VARIABLES.md for full documentation
 */

// =============================================================================
// Server-side Environment Variables (Private)
// =============================================================================

const serverSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required"),

  // NextAuth
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().min(1, "Google Client ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "Google Client Secret is required"),

  // LLM / AI
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  OLLAMA_BASE_URL: z.string().url().optional(), // Optional for local LLM

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "Invalid Stripe secret key format"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "Invalid Stripe webhook secret format"),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60), // seconds
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10), // requests
});

// =============================================================================
// Client-side Environment Variables (Public)
// =============================================================================

const clientSchema = z.object({
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Supabase URL must be valid"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLIC_KEY: z.string().startsWith("pk_", "Invalid Stripe public key format"),
});

// =============================================================================
// Validation & Export
// =============================================================================

/**
 * Validates environment variables and throws descriptive errors if validation fails.
 * This runs at import time to fail fast.
 */
function validateEnv() {
  // Parse server-side variables
  const serverEnvResult = serverSchema.safeParse(process.env);

  if (!serverEnvResult.success) {
    console.error("❌ Invalid server environment variables:");
    console.error(JSON.stringify(serverEnvResult.error.format(), null, 2));
    throw new Error(
      `Server environment validation failed:\n${serverEnvResult.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`
    );
  }

  // Parse client-side variables
  const clientEnvResult = clientSchema.safeParse(process.env);

  if (!clientEnvResult.success) {
    console.error("❌ Invalid client environment variables:");
    console.error(JSON.stringify(clientEnvResult.error.format(), null, 2));
    throw new Error(
      `Client environment validation failed:\n${clientEnvResult.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`
    );
  }

  return {
    server: serverEnvResult.data,
    client: clientEnvResult.data,
  };
}

/**
 * Validated and typed environment variables.
 *
 * Usage:
 * - Server-side: `env.server.OPENAI_API_KEY`
 * - Client-side: `env.client.NEXT_PUBLIC_APP_URL`
 *
 * IMPORTANT:
 * - Never import `env.server` in client components (use client only)
 * - Always use this typed `env` object instead of `process.env`
 */
export const env = validateEnv();

// =============================================================================
// Type Exports
// =============================================================================

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
