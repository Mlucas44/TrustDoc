/**
 * Database Helper Functions
 *
 * Utilities for handling database operations with proper error handling,
 * connection pooling safeguards, and retry logic for transient errors.
 */

import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "./prisma";

/**
 * Common database error types for better error handling
 */
export enum DbErrorType {
  POOL_TIMEOUT = "POOL_TIMEOUT",
  TOO_MANY_CONNECTIONS = "TOO_MANY_CONNECTIONS",
  CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",
  TRANSIENT = "TRANSIENT",
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION",
  UNKNOWN = "UNKNOWN",
}

/**
 * Custom database error with additional context
 */
export class DbError extends Error {
  constructor(
    message: string,
    public type: DbErrorType,
    public originalError?: unknown,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = "DbError";
  }
}

/**
 * Classify Prisma errors into actionable error types
 */
function classifyPrismaError(error: unknown): DbError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Connection/Pool errors
    if (error.code === "P1001") {
      return new DbError(
        "Database connection timeout - server unreachable",
        DbErrorType.CONNECTION_TIMEOUT,
        error,
        true
      );
    }

    if (error.code === "P1008") {
      return new DbError(
        "Database operation timed out - connection pool may be exhausted",
        DbErrorType.POOL_TIMEOUT,
        error,
        true
      );
    }

    // Constraint violations (not retryable)
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[]) || [];
      return new DbError(
        `Unique constraint violation on: ${target.join(", ")}`,
        DbErrorType.CONSTRAINT_VIOLATION,
        error,
        false
      );
    }

    // Other known errors
    return new DbError(error.message, DbErrorType.UNKNOWN, error, false);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DbError(
      "Failed to initialize database client",
      DbErrorType.TOO_MANY_CONNECTIONS,
      error,
      true
    );
  }

  if (error instanceof Error) {
    // Check for common pool/connection error messages
    const message = error.message.toLowerCase();

    if (message.includes("too many connections") || message.includes("econnrefused")) {
      return new DbError(
        "Too many database connections - pool exhausted",
        DbErrorType.TOO_MANY_CONNECTIONS,
        error,
        true
      );
    }

    if (message.includes("timeout") || message.includes("timed out")) {
      return new DbError("Database operation timed out", DbErrorType.POOL_TIMEOUT, error, true);
    }

    return new DbError(error.message, DbErrorType.UNKNOWN, error, false);
  }

  return new DbError("Unknown database error occurred", DbErrorType.UNKNOWN, error, false);
}

/**
 * Wrapper that executes a database operation with proper error handling
 *
 * This function:
 * - Catches and classifies database errors
 * - Provides actionable error messages
 * - Identifies retryable vs non-retryable errors
 *
 * @param fn - Function that receives the Prisma client and returns a Promise
 * @returns The result of the database operation
 * @throws DbError with classified error type and metadata
 *
 * @example
 * ```ts
 * // Basic usage
 * const user = await withDb(async (db) => {
 *   return db.user.findUnique({ where: { id: "123" } });
 * });
 *
 * // With error handling
 * try {
 *   const result = await withDb(async (db) => {
 *     return db.analysis.create({ data: { ... } });
 *   });
 * } catch (error) {
 *   if (error instanceof DbError && error.isRetryable) {
 *     // Retry logic for transient errors
 *   }
 * }
 * ```
 */
export async function withDb<T>(fn: (db: PrismaClient) => Promise<T>): Promise<T> {
  try {
    return await fn(prisma);
  } catch (error) {
    const dbError = classifyPrismaError(error);

    // Log the error for monitoring (in production, send to logging service)
    console.error(`[DB Error] ${dbError.type}: ${dbError.message}`, {
      type: dbError.type,
      isRetryable: dbError.isRetryable,
      originalError: dbError.originalError,
    });

    throw dbError;
  }
}

/**
 * Execute a database operation with automatic retry for transient errors
 *
 * @param fn - Function that receives the Prisma client and returns a Promise
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delayMs - Delay between retries in milliseconds (default: 100)
 * @returns The result of the database operation
 *
 * @example
 * ```ts
 * const user = await withDbRetry(async (db) => {
 *   return db.user.findUnique({ where: { id: "123" } });
 * }, 3, 200);
 * ```
 */
export async function withDbRetry<T>(
  fn: (db: PrismaClient) => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: DbError | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withDb(fn);
    } catch (error) {
      if (!(error instanceof DbError) || !error.isRetryable) {
        throw error;
      }

      lastError = error;

      if (attempt < maxRetries) {
        // Exponential backoff: delayMs * 2^attempt
        const backoffDelay = delayMs * Math.pow(2, attempt);
        console.warn(
          `[DB Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${backoffDelay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  throw lastError;
}
