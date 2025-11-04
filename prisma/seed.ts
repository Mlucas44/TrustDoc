/**
 * Prisma Database Seed Script
 *
 * Creates realistic test data for development:
 * - 2 demo users (with/without credits)
 * - 10 varied analyses across all contract types
 * - Spread over 30 days for pagination testing
 *
 * Features:
 * - Security guards (refuses production DB)
 * - Deterministic mode (SEED_DETERMINISTIC=true)
 * - Selective seeding (--only=users|analyses)
 * - Clean purge before seeding
 *
 * Usage:
 *   pnpm db:seed                    # Full seed
 *   pnpm db:seed --only=users       # Users only
 *   pnpm db:seed --only=analyses    # Analyses only
 *   SEED_DETERMINISTIC=true pnpm db:seed  # Reproducible data
 */

import { resolve } from "path";

import { faker } from "@faker-js/faker";
import { ContractType, PrismaClient } from "@prisma/client";
import { config } from "dotenv";

// Load environment variables (.env.local takes precedence over .env)
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { makeAnalysis } from "./factories";

const prisma = new PrismaClient();

// Parse CLI arguments
const args = process.argv.slice(2);
const onlyFlag = args.find((arg) => arg.startsWith("--only="))?.split("=")[1];

/**
 * Security guard: refuse to seed production database
 */
function checkSafety() {
  const dbUrl = process.env.DATABASE_URL || "";
  const nodeEnv = process.env.NODE_ENV;

  // Refuse production environment
  if (nodeEnv === "production") {
    throw new Error("❌ SAFETY: Refusing to seed production environment (NODE_ENV=production)");
  }

  // Refuse non-local database hosts
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
      `❌ SAFETY: Refusing to seed remote database.\n` +
        `   DATABASE_URL appears to be a production host.\n` +
        `   Use localhost or explicitly bypass this check.`
    );
  }

  console.log("✓ Safety check passed (local database detected)");
}

/**
 * Configure deterministic mode if requested
 */
function setupDeterministicMode() {
  if (process.env.SEED_DETERMINISTIC === "true") {
    faker.seed(42); // Fixed seed for reproducibility
    console.log("✓ Deterministic mode enabled (faker seed: 42)");
  }
}

/**
 * Clean database (respecting FK order)
 */
async function purgeDatabase() {
  console.log("\n🧹 Purging database...");

  // Delete in FK order: Analysis first, then User
  const deletedAnalyses = await prisma.analysis.deleteMany({});
  const deletedUsers = await prisma.user.deleteMany({});

  console.log(`   Deleted ${deletedAnalyses.count} analyses, ${deletedUsers.count} users`);
}

/**
 * Seed users
 */
async function seedUsers() {
  console.log("\n👥 Creating users...");

  // Demo user with credits
  const demoUser = await prisma.user.create({
    data: {
      email: "demo@trustdoc.app",
      credits: 10,
    },
  });

  // Guest user without credits
  const guestUser = await prisma.user.create({
    data: {
      email: "invite@trustdoc.app",
      credits: 0,
    },
  });

  console.log(`   ✓ ${demoUser.email} (${demoUser.credits} credits)`);
  console.log(`   ✓ ${guestUser.email} (${guestUser.credits} credits)`);

  return { demoUser, guestUser };
}

/**
 * Seed analyses with varied types and dates
 */
async function seedAnalyses(userId: string) {
  console.log("\n📄 Creating analyses...");

  const contractTypes = Object.values(ContractType);
  const analyses = [];

  // Create 10 analyses spread over 30 days
  for (let i = 0; i < 10; i++) {
    const contractType = contractTypes[i % contractTypes.length];
    const daysAgo = Math.floor((i / 10) * 30); // Spread over 30 days

    const analysisData = makeAnalysis({
      userId,
      contractType,
      createdDaysAgo: daysAgo,
    });

    const analysis = await prisma.analysis.create({
      data: analysisData,
    });

    analyses.push(analysis);

    console.log(
      `   ✓ ${analysis.filename.padEnd(40)} | ${analysis.type.padEnd(12)} | Risk: ${analysis.riskScore}% | ${daysAgo}d ago`
    );
  }

  return analyses;
}

type User = { id: string; email: string; credits: number };
type Analysis = { id: string; type: ContractType; riskScore: number };

/**
 * Display summary statistics
 */
function displaySummary(users: User[], analyses: Analysis[]) {
  const riskScores = analyses.map((a) => a.riskScore);
  const minRisk = Math.min(...riskScores);
  const maxRisk = Math.max(...riskScores);
  const avgRisk = Math.round(riskScores.reduce((sum, r) => sum + r, 0) / riskScores.length);

  const typeDistribution = analyses.reduce(
    (acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log("\n" + "=".repeat(60));
  console.log("✅ DATABASE SEED COMPLETED");
  console.log("=".repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Users:     ${users.length}`);
  console.log(`   Analyses:  ${analyses.length}`);
  console.log(`\n📈 Risk Scores:`);
  console.log(`   Min:       ${minRisk}%`);
  console.log(`   Max:       ${maxRisk}%`);
  console.log(`   Average:   ${avgRisk}%`);
  console.log(`\n📑 Contract Types:`);
  Object.entries(typeDistribution)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .forEach(([type, count]) => {
      console.log(`   ${type.padEnd(12)} ${count}`);
    });
  console.log(`\n💡 Test with:`);
  console.log(`   pnpm db:studio    # Visual database browser`);
  console.log(`   User login:       demo@trustdoc.app`);
  console.log("=".repeat(60) + "\n");
}

/**
 * Main seeding function
 */
async function main() {
  console.log("🌱 Starting database seed...");
  console.log(`   Mode: ${process.env.SEED_DETERMINISTIC === "true" ? "Deterministic" : "Random"}`);
  console.log(`   Filter: ${onlyFlag || "all"}`);

  // Safety checks
  checkSafety();
  setupDeterministicMode();

  // Purge existing data
  if (!onlyFlag || onlyFlag === "all") {
    await purgeDatabase();
  }

  let users: User[] = [];
  let analyses: Analysis[] = [];

  // Seed users
  if (!onlyFlag || onlyFlag === "users") {
    const { demoUser, guestUser } = await seedUsers();
    users = [demoUser, guestUser];
  }

  // Seed analyses
  if (!onlyFlag || onlyFlag === "analyses") {
    // Get or create demo user for analyses
    let demoUser = await prisma.user.findUnique({
      where: { email: "demo@trustdoc.app" },
    });

    if (!demoUser) {
      console.log("\n⚠️  Demo user not found, creating it first...");
      demoUser = await prisma.user.create({
        data: {
          email: "demo@trustdoc.app",
          credits: 10,
        },
      });
    }

    analyses = await seedAnalyses(demoUser.id);
  }

  // Display summary
  if (users.length > 0 || analyses.length > 0) {
    // Fetch all for summary if partial seed
    const allUsers = users.length > 0 ? users : await prisma.user.findMany();
    const allAnalyses = analyses.length > 0 ? analyses : await prisma.analysis.findMany();

    displaySummary(allUsers, allAnalyses);
  }
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e.message);
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
