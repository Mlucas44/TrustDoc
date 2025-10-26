/**
 * Prisma Database Seed Script
 *
 * Creates test data for development:
 * - 1 test user with 10 credits
 * - 2 sample analyses
 *
 * Usage: pnpm db:seed
 */

import "dotenv/config";

import { PrismaClient, ContractType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      credits: 10,
    },
  });

  console.log(`✓ Created user: ${user.email} (${user.id})`);

  // Create sample analyses
  const analysis1 = await prisma.analysis.create({
    data: {
      userId: user.id,
      filename: "contrat_freelance.pdf",
      type: ContractType.FREELANCE,
      textLength: 1500,
      summary: "Contrat de freelance avec clause de non-concurrence et paiement à 30 jours.",
      riskScore: 35,
      redFlags: [
        "Clause de non-concurrence très large (2 ans, toute l'Europe)",
        "Pas de clause de résiliation anticipée",
      ],
      clauses: [
        { type: "payment", content: "Paiement à 30 jours", risk: "low" },
        { type: "non-compete", content: "2 ans, Europe entière", risk: "high" },
      ],
    },
  });

  const analysis2 = await prisma.analysis.create({
    data: {
      userId: user.id,
      filename: "cgu_plateforme.pdf",
      type: ContractType.CGU,
      textLength: 3000,
      summary: "Conditions générales d'utilisation standard avec RGPD conforme.",
      riskScore: 15,
      redFlags: ["Collecte de données étendue"],
      clauses: [
        { type: "data", content: "Collecte de données utilisateur", risk: "medium" },
        { type: "liability", content: "Limitation de responsabilité", risk: "low" },
      ],
    },
  });

  console.log(`✓ Created analysis: ${analysis1.filename} (risk: ${analysis1.riskScore}%)`);
  console.log(`✓ Created analysis: ${analysis2.filename} (risk: ${analysis2.riskScore}%)`);

  console.log("\n✅ Database seed completed!");
  console.log(`   User: ${user.email}`);
  console.log(`   Analyses: 2`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
