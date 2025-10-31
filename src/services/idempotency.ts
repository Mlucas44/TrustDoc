/**
 * Idempotency Service
 *
 * Prevents duplicate analysis creation and credit charges on retries/refreshes.
 * Uses database-backed idempotency keys with in-memory mutex for concurrency control.
 */

import "server-only";

import { createHash } from "crypto";

import { type IdempotencyStatus } from "@prisma/client";

import { prisma } from "@/src/lib/prisma";

/**
 * Idempotency lock timeout (2 minutes)
 * If a request takes longer than this, the lock expires
 */
const LOCK_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Idempotency key expiration (24 hours)
 */
const KEY_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * In-memory mutex to prevent concurrent processing of same idempotency key
 * Maps idempotencyKey → Promise<void>
 */
const mutexMap = new Map<string, Promise<void>>();

/**
 * Idempotency result for a request
 */
export interface IdempotencyResult<T = unknown> {
  /**
   * Whether this is a replay (key already processed)
   */
  isReplay: boolean;

  /**
   * Status of the idempotency key
   */
  status: IdempotencyStatus;

  /**
   * Result ID (Analysis ID) if succeeded
   */
  resultId?: string;

  /**
   * Result data (for replays)
   */
  result?: T;

  /**
   * Error code if failed
   */
  errorCode?: string;

  /**
   * Error message if failed
   */
  errorMessage?: string;
}

/**
 * Error thrown when idempotency key is already being processed
 */
export class IdempotencyConflictError extends Error {
  constructor(
    public readonly key: string,
    message = "Request with this idempotency key is already being processed"
  ) {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

/**
 * Create fingerprint from request parameters
 * Used to detect duplicate requests with same key but different parameters
 *
 * @param params - Request parameters to fingerprint
 * @returns SHA-256 hash of parameters
 */
export function createFingerprint(params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = params[key];
        return acc;
      },
      {} as Record<string, unknown>
    );

  const str = JSON.stringify(sorted);
  return createHash("sha256").update(str).digest("hex");
}

/**
 * Check if idempotency key exists and return status
 *
 * @param key - Idempotency key
 * @param fingerprint - Request fingerprint
 * @returns Idempotency result or null if key doesn't exist
 */
export async function checkIdempotency(
  key: string,
  fingerprint: string
): Promise<IdempotencyResult | null> {
  const record = await prisma.idempotency.findUnique({
    where: { key },
  });

  if (!record) {
    return null;
  }

  // Verify fingerprint matches
  if (record.fingerprint !== fingerprint) {
    throw new Error(
      `Idempotency key "${key}" used with different parameters. Original fingerprint: ${record.fingerprint}, Current: ${fingerprint}`
    );
  }

  // Check if key has expired
  if (record.expiresAt < new Date()) {
    // Key expired, can be reused
    await prisma.idempotency.delete({ where: { key } });
    return null;
  }

  // Check if lock has expired (PENDING but lock timed out)
  if (record.status === "PENDING" && record.lockedUntil && record.lockedUntil < new Date()) {
    // Lock expired, can retry
    await prisma.idempotency.update({
      where: { key },
      data: {
        status: "FAILED",
        errorCode: "TIMEOUT",
        errorMessage: "Request timed out",
      },
    });

    return {
      isReplay: true,
      status: "FAILED",
      errorCode: "TIMEOUT",
      errorMessage: "Request timed out",
    };
  }

  return {
    isReplay: true,
    status: record.status,
    resultId: record.resultId || undefined,
    errorCode: record.errorCode || undefined,
    errorMessage: record.errorMessage || undefined,
  };
}

/**
 * Create idempotency record in PENDING state
 *
 * @param key - Idempotency key
 * @param fingerprint - Request fingerprint
 * @throws {IdempotencyConflictError} If key already exists
 */
export async function createIdempotencyRecord(key: string, fingerprint: string): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + KEY_EXPIRATION_MS);
  const lockedUntil = new Date(now.getTime() + LOCK_TIMEOUT_MS);

  try {
    await prisma.idempotency.create({
      data: {
        key,
        status: "PENDING",
        fingerprint,
        lockedAt: now,
        lockedUntil,
        expiresAt,
      },
    });
  } catch (error) {
    // Unique constraint violation - key already exists
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      throw new IdempotencyConflictError(key);
    }
    throw error;
  }
}

/**
 * Mark idempotency record as succeeded
 *
 * @param key - Idempotency key
 * @param resultId - Analysis ID
 */
export async function markIdempotencySuccess(key: string, resultId: string): Promise<void> {
  await prisma.idempotency.update({
    where: { key },
    data: {
      status: "SUCCEEDED",
      resultId,
      lockedAt: null,
      lockedUntil: null,
    },
  });
}

/**
 * Mark idempotency record as failed
 *
 * @param key - Idempotency key
 * @param errorCode - Error code
 * @param errorMessage - Error message
 */
export async function markIdempotencyFailure(
  key: string,
  errorCode: string,
  errorMessage: string
): Promise<void> {
  await prisma.idempotency.update({
    where: { key },
    data: {
      status: "FAILED",
      errorCode,
      errorMessage,
      lockedAt: null,
      lockedUntil: null,
    },
  });
}

/**
 * Execute a function with idempotency protection
 *
 * This function provides:
 * 1. Idempotency checking (replay detection)
 * 2. In-memory mutex (prevents concurrent execution)
 * 3. Database locking (prevents distributed concurrent execution)
 * 4. Automatic status tracking (PENDING → SUCCEEDED/FAILED)
 *
 * @param key - Idempotency key (client-provided)
 * @param fingerprint - Request fingerprint (hash of params)
 * @param fn - Function to execute (should return result ID on success)
 * @returns Idempotency result with replay status
 *
 * @example
 * ```ts
 * const result = await withIdempotency(
 *   "idem_xyz123",
 *   createFingerprint({ textClean, contractType }),
 *   async () => {
 *     // Persist analysis
 *     const analysis = await AnalysisRepo.create(...);
 *
 *     // Consume credits
 *     await UserRepo.consumeCredits(userId, 1);
 *
 *     return analysis.id;
 *   }
 * );
 *
 * if (result.isReplay) {
 *   // Return cached result without charging credits
 *   return result.resultId;
 * }
 * ```
 */
export async function withIdempotency<T = string>(
  key: string,
  fingerprint: string,
  fn: () => Promise<T>
): Promise<IdempotencyResult<T>> {
  // 1. Check if idempotency key already exists
  const existing = await checkIdempotency(key, fingerprint);

  if (existing) {
    // Key already processed - return cached result
    console.log(`[withIdempotency] Replay detected for key ${key}, status: ${existing.status}`);
    return existing as IdempotencyResult<T>;
  }

  // 2. Acquire in-memory mutex (prevent concurrent execution in same process)
  const existingMutex = mutexMap.get(key);
  if (existingMutex) {
    // Wait for existing execution to complete
    await existingMutex;

    // After wait, check DB again
    const retry = await checkIdempotency(key, fingerprint);
    if (retry) {
      console.log(`[withIdempotency] Mutex released, returning cached result for key ${key}`);
      return retry as IdempotencyResult<T>;
    }
  }

  // 3. Create mutex promise for this key
  let resolveMutex: () => void;
  const mutexPromise = new Promise<void>((resolve) => {
    resolveMutex = resolve;
  });
  mutexMap.set(key, mutexPromise);

  try {
    // 4. Create idempotency record in PENDING state
    await createIdempotencyRecord(key, fingerprint);

    // 5. Execute function
    let resultId: T;
    try {
      resultId = await fn();
    } catch (error) {
      // Function failed - mark as FAILED
      const errorCode = error instanceof Error ? error.constructor.name : "UNKNOWN_ERROR";
      const errorMessage = error instanceof Error ? error.message : String(error);

      await markIdempotencyFailure(key, errorCode, errorMessage);

      console.error(`[withIdempotency] Function failed for key ${key}:`, error);
      throw error;
    }

    // 6. Mark as SUCCEEDED
    await markIdempotencySuccess(key, String(resultId));

    console.log(`[withIdempotency] Success for key ${key}, resultId: ${resultId}`);

    return {
      isReplay: false,
      status: "SUCCEEDED",
      resultId: String(resultId),
      result: resultId,
    };
  } finally {
    // 7. Release mutex
    mutexMap.delete(key);
    resolveMutex!();
  }
}

/**
 * Clean up expired idempotency records
 * Should be run periodically (e.g., via cron job)
 *
 * @returns Number of deleted records
 */
export async function cleanupExpiredIdempotencyRecords(): Promise<number> {
  const result = await prisma.idempotency.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(`[cleanupExpiredIdempotencyRecords] Deleted ${result.count} expired records`);
  return result.count;
}
