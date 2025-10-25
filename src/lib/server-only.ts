/**
 * Server-Only Module Guard
 *
 * This module ensures that certain code only runs on the server.
 * If imported in a client component, it will throw an error at runtime.
 *
 * Usage:
 * Import this at the top of any server-only module:
 * ```ts
 * import "@/lib/server-only";
 * ```
 *
 * This is especially important for modules that:
 * - Access server-side environment variables (env.server.*)
 * - Use Node.js APIs
 * - Connect to databases
 * - Handle secrets or sensitive data
 */

if (typeof window !== "undefined") {
  throw new Error(
    `❌ Server-only module imported on client side.\n\n` +
      `This module contains server-only code and should never be imported in client components.\n` +
      `Check your imports and ensure you're not using server-side code in files marked with 'use client'.\n\n` +
      `Common causes:\n` +
      `  - Importing env.server.* in a client component\n` +
      `  - Using Node.js APIs (fs, path, crypto) in client code\n` +
      `  - Importing database clients in client components\n\n` +
      `Stack trace below shows where this import occurred.`
  );
}

export {};
