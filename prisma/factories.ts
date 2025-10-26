/**
 * Data Factories for Seeding
 *
 * Helpers to generate realistic, coherent test data for Users and Analyses.
 * Uses @faker-js/faker for randomization.
 */

import { faker } from "@faker-js/faker";
import { ContractType } from "@prisma/client";

/**
 * Red flag severity levels
 */
export type Severity = "low" | "medium" | "high";

/**
 * Red flag structure
 */
export interface RedFlag {
  title: string;
  severity: Severity;
  why: string;
  clause_excerpt: string;
}

/**
 * Contract type metadata for realistic data generation
 */
const CONTRACT_METADATA: Record<
  ContractType,
  {
    filenamePrefixes: string[];
    commonClauses: string[];
    riskProfile: { min: number; max: number };
    severityWeights: Record<Severity, number>;
  }
> = {
  CGU: {
    filenamePrefixes: ["CGU", "Terms", "Conditions", "ToS"],
    commonClauses: [
      "Propriété intellectuelle",
      "Utilisation des données",
      "Responsabilité limitée",
      "Résiliation",
      "Juridiction compétente",
    ],
    riskProfile: { min: 10, max: 40 },
    severityWeights: { low: 0.6, medium: 0.3, high: 0.1 },
  },
  FREELANCE: {
    filenamePrefixes: ["Freelance", "Contract", "Prestation", "Mission"],
    commonClauses: [
      "Rémunération",
      "Durée de la mission",
      "Propriété intellectuelle",
      "Confidentialité",
      "Clause de non-concurrence",
    ],
    riskProfile: { min: 20, max: 70 },
    severityWeights: { low: 0.4, medium: 0.4, high: 0.2 },
  },
  EMPLOI: {
    filenamePrefixes: ["CDI", "CDD", "Contrat-travail", "Employment"],
    commonClauses: [
      "Rémunération et avantages",
      "Durée du travail",
      "Clause de mobilité",
      "Clause de non-concurrence",
      "Période d'essai",
    ],
    riskProfile: { min: 15, max: 60 },
    severityWeights: { low: 0.5, medium: 0.35, high: 0.15 },
  },
  NDA: {
    filenamePrefixes: ["NDA", "Confidentialite", "Non-disclosure", "Secret"],
    commonClauses: [
      "Définition des informations confidentielles",
      "Obligations de confidentialité",
      "Durée de l'engagement",
      "Exceptions",
      "Sanctions",
    ],
    riskProfile: { min: 25, max: 75 },
    severityWeights: { low: 0.3, medium: 0.4, high: 0.3 },
  },
  DEVIS: {
    filenamePrefixes: ["Devis", "Quote", "Estimate", "Proposition"],
    commonClauses: [
      "Description des prestations",
      "Prix et modalités de paiement",
      "Délais de réalisation",
      "Conditions d'annulation",
      "Garanties",
    ],
    riskProfile: { min: 10, max: 35 },
    severityWeights: { low: 0.7, medium: 0.25, high: 0.05 },
  },
  PARTENARIAT: {
    filenamePrefixes: ["Partnership", "Partenariat", "Collaboration", "Alliance"],
    commonClauses: [
      "Objet du partenariat",
      "Contributions des parties",
      "Répartition des bénéfices",
      "Propriété intellectuelle",
      "Durée et résiliation",
    ],
    riskProfile: { min: 30, max: 80 },
    severityWeights: { low: 0.3, medium: 0.45, high: 0.25 },
  },
  AUTRE: {
    filenamePrefixes: ["Document", "Contract", "Agreement", "Accord"],
    commonClauses: [
      "Objet du contrat",
      "Obligations des parties",
      "Conditions générales",
      "Résiliation",
      "Litiges",
    ],
    riskProfile: { min: 10, max: 60 },
    severityWeights: { low: 0.5, medium: 0.35, high: 0.15 },
  },
};

/**
 * Generate a realistic red flag based on contract type
 */
export function makeRedFlag(contractType: ContractType, severity?: Severity): RedFlag {
  const metadata = CONTRACT_METADATA[contractType];

  // Weighted random severity if not provided
  const finalSeverity =
    severity ||
    faker.helpers.weightedArrayElement([
      { weight: metadata.severityWeights.low, value: "low" as const },
      { weight: metadata.severityWeights.medium, value: "medium" as const },
      { weight: metadata.severityWeights.high, value: "high" as const },
    ]);

  const clauseType = faker.helpers.arrayElement(metadata.commonClauses);
  const clause = faker.lorem.sentence({ min: 10, max: 20 });

  const titleTemplates = {
    low: [
      `${clauseType} peu claire`,
      `Formulation ambiguë dans ${clauseType}`,
      `${clauseType} à vérifier`,
    ],
    medium: [
      `${clauseType} déséquilibrée`,
      `Risque modéré : ${clauseType}`,
      `${clauseType} potentiellement problématique`,
    ],
    high: [
      `ATTENTION : ${clauseType} abusive`,
      `Clause dangereuse : ${clauseType}`,
      `Risque élevé : ${clauseType}`,
    ],
  };

  const whyTemplates = {
    low: [
      "Cette clause manque de précision et pourrait prêter à confusion.",
      "La formulation est vague et mériterait d'être clarifiée.",
      "Les termes utilisés ne sont pas suffisamment explicites.",
    ],
    medium: [
      "Cette clause pourrait créer un déséquilibre entre les parties.",
      "Les obligations imposées semblent disproportionnées.",
      "Cette clause pourrait limiter vos droits de manière significative.",
    ],
    high: [
      "Cette clause est potentiellement abusive et pourrait être illégale.",
      "Cette disposition vous expose à un risque juridique majeur.",
      "Cette clause pourrait violer vos droits fondamentaux.",
    ],
  };

  return {
    title: faker.helpers.arrayElement(titleTemplates[finalSeverity]),
    severity: finalSeverity,
    why: faker.helpers.arrayElement(whyTemplates[finalSeverity]),
    clause_excerpt: clause,
  };
}

/**
 * Generate a realistic filename for a contract
 */
function makeFilename(contractType: ContractType): string {
  const metadata = CONTRACT_METADATA[contractType];
  const prefix = faker.helpers.arrayElement(metadata.filenamePrefixes);
  const company = faker.company.name().replace(/[^a-zA-Z0-9]/g, "-");
  const date = faker.date.past({ years: 1 }).toISOString().split("T")[0];

  return `${prefix}_${company}_${date}.pdf`;
}

/**
 * Generate realistic clauses based on contract type
 */
function makeClauses(contractType: ContractType, count: number = 5): unknown[] {
  const metadata = CONTRACT_METADATA[contractType];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    type: faker.helpers.arrayElement(metadata.commonClauses),
    content: faker.lorem.paragraph({ min: 2, max: 4 }),
    page: faker.number.int({ min: 1, max: 10 }),
  }));
}

/**
 * Analysis factory input options
 */
export interface MakeAnalysisOptions {
  userId: string;
  contractType?: ContractType;
  riskScore?: number;
  redFlagCount?: number;
  createdDaysAgo?: number;
}

/**
 * Generate a realistic Analysis with coherent data
 */
export function makeAnalysis(options: MakeAnalysisOptions) {
  const contractType =
    options.contractType || faker.helpers.arrayElement(Object.values(ContractType));

  const metadata = CONTRACT_METADATA[contractType];

  // Risk score within contract-specific bounds
  const riskScore =
    options.riskScore ??
    faker.number.int({
      min: metadata.riskProfile.min,
      max: metadata.riskProfile.max,
    });

  // Number of red flags correlates with risk score
  const redFlagCount =
    options.redFlagCount ??
    (riskScore < 20
      ? 0
      : riskScore < 40
        ? faker.number.int({ min: 1, max: 2 })
        : riskScore < 60
          ? faker.number.int({ min: 2, max: 4 })
          : faker.number.int({ min: 4, max: 7 }));

  // Generate red flags with severity distribution based on risk score
  const redFlags = Array.from({ length: redFlagCount }, () => {
    const severity: Severity =
      riskScore < 30
        ? "low"
        : riskScore < 60
          ? faker.datatype.boolean()
            ? "medium"
            : "low"
          : faker.datatype.boolean()
            ? "high"
            : "medium";

    return makeRedFlag(contractType, severity);
  });

  // Text length correlates with contract complexity
  const textLength = faker.number.int({
    min: 1000,
    max: contractType === "NDA" ? 5000 : contractType === "EMPLOI" ? 12000 : 8000,
  });

  // Created date
  const createdAt = options.createdDaysAgo
    ? new Date(Date.now() - options.createdDaysAgo * 24 * 60 * 60 * 1000)
    : faker.date.recent({ days: 30 });

  return {
    userId: options.userId,
    filename: makeFilename(contractType),
    type: contractType,
    textLength,
    summary: faker.lorem.paragraph({ min: 3, max: 6 }),
    riskScore,
    redFlags: JSON.stringify(redFlags),
    clauses: JSON.stringify(makeClauses(contractType)),
    aiResponse: JSON.stringify({
      model: "gpt-4",
      analyzed_at: createdAt.toISOString(),
      confidence: faker.number.float({ min: 0.7, max: 0.99, fractionDigits: 2 }),
    }),
    createdAt,
  };
}
