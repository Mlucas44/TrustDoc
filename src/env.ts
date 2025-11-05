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

  // Database
  // Pooled connection for runtime queries (via pgBouncer)
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),
  // Direct connection for migrations (no pooling)
  SHADOW_DATABASE_URL: z
    .string()
    .url("SHADOW_DATABASE_URL must be a valid PostgreSQL connection string")
    .optional(),

  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required"),

  // NextAuth
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().min(1, "Google Client ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "Google Client Secret is required"),

  // Email Provider (SMTP) - Optional for development
  SMTP_HOST: z.string().min(1, "SMTP host is required").optional(),
  SMTP_PORT: z.coerce.number().int().positive("SMTP port must be a positive integer").optional(),
  SMTP_USER: z.string().min(1, "SMTP user is required").optional(),
  SMTP_PASS: z.string().min(1, "SMTP password is required").optional(),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email address").optional(),

  // LLM / AI
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  OPENAI_MODEL: z.string().optional(), // Optional, defaults to gpt-4o-mini
  OLLAMA_BASE_URL: z.string().url().optional(), // Optional for local LLM, defaults to http://localhost:11434/v1
  OLLAMA_MODEL: z.string().optional(), // Optional, defaults to mistral

  // Stripe (Optional - only required when NEXT_PUBLIC_BILLING_ENABLED is true)
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "Invalid Stripe secret key format").optional(),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith("whsec_", "Invalid Stripe webhook secret format")
    .optional(),
  STRIPE_PRICE_STARTER: z
    .string()
    .startsWith("price_", "Invalid Stripe price ID format")
    .optional(),
  STRIPE_PRICE_PRO: z.string().startsWith("price_", "Invalid Stripe price ID format").optional(),
  STRIPE_PRICE_SCALE: z.string().startsWith("price_", "Invalid Stripe price ID format").optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(60), // seconds
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10), // requests

  // File Upload
  UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().default(10), // MB
  UPLOAD_ALLOWED_MIME_TYPES: z.string().default("application/pdf"), // comma-separated
  MOCK_STORAGE: z.enum(["true", "false"]).default("false"), // boolean flag

  // Data Retention Policy
  PDF_TTL_MINUTES: z.coerce.number().int().positive().default(30), // minutes
  ANALYSIS_RETENTION_DAYS: z.coerce.number().int().positive().default(365), // days
  ANALYSIS_PURGE_DAYS: z.coerce.number().int().positive().default(30), // days

  // CRON Jobs
  CRON_SECRET: z.string().min(32, "CRON_SECRET must be at least 32 characters"),

  // LLM Options
  USE_OLLAMA: z.enum(["true", "false"]).default("false"), // Use local Ollama instead of OpenAI
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

  // Stripe (Optional - only required when NEXT_PUBLIC_BILLING_ENABLED is true)
  NEXT_PUBLIC_STRIPE_PUBLIC_KEY: z
    .string()
    .startsWith("pk_", "Invalid Stripe public key format")
    .optional(),
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
