/**
 * Contract Type Detection Schemas
 *
 * Zod schemas for validating contract type detection results.
 */

import { z } from "zod";

/**
 * Contract types supported by the detection system
 */
export const ContractTypeEnum = z.enum([
  "CGU", // Terms of Service / General Terms
  "FREELANCE", // Freelance / Independent Contractor Agreement
  "EMPLOI", // Employment Contract (CDI/CDD)
  "NDA", // Non-Disclosure Agreement / Confidentiality
  "DEVIS", // Quote / Estimate
  "PARTENARIAT", // Partnership / Collaboration Agreement
  "FORM_CERFA", // Administrative Form / Cerfa
  "TABULAR_COMMERCIAL", // Commercial Table / Pricing Sheet
  "AUTRE", // Other / Unknown
]);

export type ContractType = z.infer<typeof ContractTypeEnum>;

/**
 * Synonyms and aliases for each contract type
 */
export const CONTRACT_TYPE_ALIASES: Record<ContractType, string[]> = {
  CGU: [
    "terms of service",
    "terms and conditions",
    "conditions générales",
    "conditions d'utilisation",
    "cgu",
    "cgv",
    "conditions générales de vente",
    "general terms",
  ],
  FREELANCE: [
    "freelance",
    "independent contractor",
    "consultant",
    "prestation de services",
    "contrat de prestation",
    "master services agreement",
    "msa",
    "statement of work",
    "sow",
  ],
  EMPLOI: [
    "employment contract",
    "contrat de travail",
    "cdi",
    "cdd",
    "labor contract",
    "employment agreement",
    "job contract",
  ],
  NDA: [
    "non-disclosure agreement",
    "nda",
    "confidentiality agreement",
    "accord de confidentialité",
    "confidentiality",
    "secrecy agreement",
  ],
  DEVIS: ["quote", "estimate", "devis", "quotation", "proposal", "bid", "price quote"],
  PARTENARIAT: [
    "partnership",
    "partenariat",
    "collaboration",
    "joint venture",
    "cooperation agreement",
    "strategic alliance",
    "memorandum of understanding",
    "mou",
  ],
  FORM_CERFA: [
    "cerfa",
    "formulaire administratif",
    "formulaire",
    "administrative form",
    "form",
    "declaration",
    "demande",
  ],
  TABULAR_COMMERCIAL: ["devis", "quotation", "pricing", "tarif", "price list", "catalogue"],
  AUTRE: ["other", "unknown", "autre", "miscellaneous"],
};

/**
 * Detection result schema
 */
export const DetectionResultSchema = z.object({
  type: ContractTypeEnum,
  confidence: z.number().min(0).max(1),
  source: z.enum(["heuristic", "llm", "hybrid"]),
  evidence: z.array(z.string().max(200)).max(5),
  reason: z.string().optional(),
});

export type DetectionResult = z.infer<typeof DetectionResultSchema>;

/**
 * Heuristic detection result schema (internal)
 */
export const HeuristicResultSchema = z.object({
  type: ContractTypeEnum,
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string().max(200)).max(5),
  scores: z.record(ContractTypeEnum, z.number().min(0).max(1)),
});

export type HeuristicResult = z.infer<typeof HeuristicResultSchema>;

/**
 * LLM detection result schema (internal)
 */
export const LLMResultSchema = z.object({
  type: ContractTypeEnum,
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export type LLMResult = z.infer<typeof LLMResultSchema>;
