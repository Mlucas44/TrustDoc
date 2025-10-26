/**
 * Analysis Repository
 *
 * Data access layer for Analysis model with pagination and soft-delete.
 */

import "@/src/lib/server-only";

import { prisma } from "@/src/lib/prisma";

import type { ContractType, Prisma } from "@prisma/client";

export type AppAnalysis = {
  id: string;
  userId: string;
  filename: string;
  type: ContractType;
  textLength: number;
  summary: string | null;
  riskScore: number;
  redFlags: unknown;
  clauses: unknown;
  createdAt: Date;
  deletedAt: Date | null;
};

export type CreateAnalysisInput = {
  userId: string;
  filename: string;
  type?: ContractType;
  textLength: number;
  summary?: string;
  riskScore: number;
  redFlags?: unknown;
  clauses?: unknown;
  aiResponse?: unknown;
};

export type ListAnalysesOptions = {
  limit?: number;
  cursor?: string;
  type?: ContractType;
  includeDeleted?: boolean;
};

/**
 * Analysis Repository Class
 */
export class AnalysisRepo {
  /**
   * Create new analysis
   */
  static async create(input: CreateAnalysisInput): Promise<AppAnalysis> {
    // Validate riskScore bounds
    if (input.riskScore < 0 || input.riskScore > 100) {
      throw new Error("riskScore must be between 0 and 100");
    }

    // Validate textLength
    if (input.textLength < 0) {
      throw new Error("textLength must be non-negative");
    }

    return prisma.analysis.create({
      data: {
        userId: input.userId,
        filename: input.filename,
        type: input.type,
        textLength: input.textLength,
        summary: input.summary,
        riskScore: input.riskScore,
        redFlags: input.redFlags as Prisma.JsonValue,
        clauses: input.clauses as Prisma.JsonValue,
        aiResponse: input.aiResponse as Prisma.JsonValue,
      },
      select: {
        id: true,
        userId: true,
        filename: true,
        type: true,
        textLength: true,
        summary: true,
        riskScore: true,
        redFlags: true,
        clauses: true,
        createdAt: true,
        deletedAt: true,
      },
    });
  }

  /**
   * List analyses for a user with pagination
   */
  static async listByUser(
    userId: string,
    options: ListAnalysesOptions = {}
  ): Promise<AppAnalysis[]> {
    const { limit = 10, cursor, type, includeDeleted = false } = options;

    const where: Prisma.AnalysisWhereInput = {
      userId,
      ...(type && { type }),
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    return prisma.analysis.findMany({
      where,
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        filename: true,
        type: true,
        textLength: true,
        summary: true,
        riskScore: true,
        redFlags: true,
        clauses: true,
        createdAt: true,
        deletedAt: true,
      },
    });
  }

  /**
   * Get analysis by ID
   */
  static async getById(id: string): Promise<AppAnalysis | null> {
    return prisma.analysis.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        filename: true,
        type: true,
        textLength: true,
        summary: true,
        riskScore: true,
        redFlags: true,
        clauses: true,
        createdAt: true,
        deletedAt: true,
      },
    });
  }

  /**
   * Soft delete analysis
   * Only the owner can delete their analysis
   */
  static async softDelete(id: string, userId: string): Promise<AppAnalysis> {
    // Verify ownership
    const analysis = await this.getById(id);
    if (!analysis) {
      throw new Error(`Analysis ${id} not found`);
    }

    if (analysis.userId !== userId) {
      throw new Error(`User ${userId} does not own analysis ${id}`);
    }

    return prisma.analysis.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        userId: true,
        filename: true,
        type: true,
        textLength: true,
        summary: true,
        riskScore: true,
        redFlags: true,
        clauses: true,
        createdAt: true,
        deletedAt: true,
      },
    });
  }
}
