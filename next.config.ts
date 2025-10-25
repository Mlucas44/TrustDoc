import type { NextConfig } from "next";

/**
 * Next.js Configuration
 *
 * IMPORTANT: Environment Variable Security
 * - Do NOT add `env: { ... }` to expose server variables to the client
 * - Only NEXT_PUBLIC_* prefixed variables are automatically exposed
 * - All environment validation is handled in src/env.ts
 * - Never copy process.env wholesale into the config
 *
 * @see https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
 */

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Explicitly do NOT expose server-side env vars to the client
  // Only NEXT_PUBLIC_* variables are automatically available on the client
  // This prevents accidental exposure of secrets

  // Note: Environment validation is handled via prebuild script (pnpm env:check)
  // This ensures all vars are validated before the build starts
};

export default nextConfig;
