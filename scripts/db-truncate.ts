/**
 * Database Truncate Script
 *
 * Empties all tables while preserving the schema.
 * Useful for testing or cleaning up between test runs.
 *
 * Safety: Refuses to run on production databases
 *
 * Usage: pnpm db:truncate
 */

import { config } from "dotenv";

import { resolve } from "path";

// Load environment variables (.env.local takes precedence)
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Security guard: refuse to truncate production database
 */
function checkSafety() {
  const dbUrl = process.env.DATABASE_URL || "";
  const nodeEnv = process.env.NODE_ENV;

  if (nodeEnv === "production") {
    throw new Error("❌ SAFETY: Refusing to truncate production environment (NODE_ENV=production)");
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
      `❌ SAFETY: Refusing to truncate remote database.\n` +
        `   DATABASE_URL appears to be a production host.`
    );
  }

  console.log("✓ Safety check passed (local database detected)");
}

async function main() {
  console.log("🗑️  Truncating database...");

  checkSafety();

  // Delete in FK order
  const deletedAnalyses = await prisma.analysis.deleteMany({});
  const deletedUsers = await prisma.user.deleteMany({});

  console.log(
    `\n✅ Database truncated:\n   - ${deletedAnalyses.count} analyses\n   - ${deletedUsers.count} users`
  );
}

main()
  .catch((e) => {
    console.error("\n❌ Truncate failed:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
