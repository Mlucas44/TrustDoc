/**
 * Database Reset Script
 *
 * Full reset workflow:
 * 1. Drop all tables
 * 2. Run migrations
 * 3. Seed database
 *
 * Safety: Refuses to run on production databases
 *
 * Usage: pnpm db:reset
 */

import { config } from "dotenv";

import { resolve } from "path";

// Load environment variables (.env.local takes precedence)
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Security guard: refuse to reset production database
 */
function checkSafety() {
  const dbUrl = process.env.DATABASE_URL || "";
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === "production") {
    throw new Error("❌ SAFETY: Refusing to reset production environment (NODE_ENV=production)");
  }

  const dangerousHosts = [
    "supabase.co",
    "supabase.com",
    "amazonaws.com",
    "azure.com",
    "googlecloud.com",
  ];

  const hasProductionHost = dangerousHosts.some((host) => dbUrl.toLowerCase().includes(host));

  if (hasProductionHost && !dbUrl.includes("localhost")) {
    throw new Error(
      `❌ SAFETY: Refusing to reset remote database.\n` +
        `   DATABASE_URL appears to be a production host.`
    );
  }

  console.log("✓ Safety check passed (local database detected)");
}

async function runCommand(command: string, description: string) {
  console.log(`\n${description}...`);
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

async function main() {
  console.log("🔄 Database Reset Starting...");
  console.log("=".repeat(60));

  checkSafety();

  const startTime = Date.now();

  // Step 1: Prisma migrate reset (drops DB, recreates, runs migrations)
  await runCommand(
    "prisma migrate reset --force --skip-seed",
    "1️⃣  Resetting database and running migrations"
  );

  // Step 2: Seed database
  await runCommand("tsx prisma/seed.ts", "2️⃣  Seeding database");

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Database reset completed in ${duration}s`);
  console.log("=".repeat(60));
}

main().catch((e) => {
  console.error("\n❌ Reset failed:", e.message);
  process.exit(1);
});
