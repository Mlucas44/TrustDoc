/**
 * Analysis Schema
 *
 * Zod schemas for validating LLM analysis output.
 * Ensures structured, exploitable, and reliable AI responses.
 */

import { z } from "zod";

/**
 * Red flag severity levels
 */
export const RedFlagSeverityEnum = z.enum(["low", "medium", "high"]);

export type RedFlagSeverity = z.infer<typeof RedFlagSeverityEnum>;

/**
 * Red flag (risk) identified in the contract
 */
export const RedFlagSchema = z.object({
  title: z.string().min(1).max(200),
  severity: RedFlagSeverityEnum,
  why: z.string().min(10).max(1000),
  clause_excerpt: z.string().min(10).max(500),
});

export type RedFlag = z.infer<typeof RedFlagSchema>;

/**
 * Contract clause extracted from the document
 */
export const ClauseSchema = z.object({
  type: z.string().min(1).max(100), // e.g., "Durée & renouvellement"
  text: z.string().min(10).max(2000),
});

export type Clause = z.infer<typeof ClauseSchema>;

/**
 * Complete analysis result from LLM
 */
export const AnalysisSchema = z.object({
  summary: z.array(z.string().min(10).max(500)).min(3).max(10),
  riskScore: z.number().int().min(0).max(100),
  riskJustification: z.string().min(20).max(1000),
  redFlags: z.array(RedFlagSchema),
  clauses: z.array(ClauseSchema),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema>;

/**
 * Custom error for invalid LLM output
 */
export class AnalysisInvalidError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: string[]
  ) {
    super(message);
    this.name = "AnalysisInvalidError";
  }
}
