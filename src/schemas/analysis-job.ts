/**
 * Zod schemas for analysis job validation
 */

import { z } from "zod";

import { ContractTypeEnum } from "./detect";

/**
 * Analysis job status enum
 */
export const AnalysisJobStatusEnum = z.enum(["prepared", "analyzed", "failed"]);
export type AnalysisJobStatus = z.infer<typeof AnalysisJobStatusEnum>;

/**
 * POST /api/prepare request body schema
 */
export const PrepareRequestSchema = z.object({
  filePath: z
    .string()
    .min(1, "filePath is required")
    .regex(
      /^(user-[a-z0-9-]+|guest-[a-z0-9-]+)\/[a-z0-9-]+\.pdf$/i,
      "Invalid filePath format. Expected: {user-userId|guest-guestId}/{fileId}.pdf"
    ),
});

export type PrepareRequest = z.infer<typeof PrepareRequestSchema>;

/**
 * POST /api/prepare response schema
 */
export const PrepareResponseSchema = z.object({
  jobId: z.string().min(1),
});

export type PrepareResponse = z.infer<typeof PrepareResponseSchema>;

/**
 * POST /api/analyze request body schema
 */
export const AnalyzeRequestSchema = z.object({
  jobId: z.string().min(1, "jobId is required"),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

/**
 * Analysis job data from DB
 */
export const AnalysisJobSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  guest_id: z.string().nullable(),
  status: AnalysisJobStatusEnum,
  file_path: z.string().nullable(),
  filename: z.string().nullable(),
  contract_type: ContractTypeEnum.nullable(),
  text_raw: z.string().nullable(),
  text_clean: z.string().nullable(),
  text_length_raw: z.number().int().nullable(),
  text_length_clean: z.number().int().nullable(),
  text_tokens_approx: z.number().int().nullable(),
  pages: z.number().int().nullable(),
  meta: z.record(z.string(), z.any()).nullable(),
  sections: z.array(z.any()).nullable(),
  result: z.record(z.string(), z.any()).nullable(),
  error_code: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
  expires_at: z.date(),
});

export type AnalysisJob = z.infer<typeof AnalysisJobSchema>;

/**
 * Analysis job insert data (for creating new jobs)
 */
export const AnalysisJobInsertSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  guest_id: z.string().optional(),
  status: AnalysisJobStatusEnum.default("prepared"),
  file_path: z.string().optional(),
  filename: z.string().optional(),
  contract_type: ContractTypeEnum.optional(),
  text_raw: z.string().optional(),
  text_clean: z.string().optional(),
  text_length_raw: z.number().int().optional(),
  text_length_clean: z.number().int().optional(),
  text_tokens_approx: z.number().int().optional(),
  pages: z.number().int().optional(),
  meta: z.record(z.string(), z.any()).optional(),
  sections: z.array(z.any()).optional(),
});

export type AnalysisJobInsert = z.infer<typeof AnalysisJobInsertSchema>;
