/**
 * Environment Variables Check Script
 *
 * This script validates that all required environment variables are present
 * and correctly formatted. It's used in CI/CD and can be run locally.
 *
 * Usage:
 *   pnpm env:check
 *
 * Exit codes:
 *   0 - All environment variables are valid
 *   1 - Validation failed (missing or invalid variables)
 */

// Load environment variables BEFORE importing env.ts
import { resolve } from "path";

import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// Dynamic import to ensure dotenv loads first
(async () => {
  await import("../src/env");
  console.log("✅ All environment variables are valid!");
  process.exit(0);
})();
