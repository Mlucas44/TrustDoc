/**
 * Credits Service
 *
 * Business logic layer for user credit management.
 * Provides credit validation and transactional consumption with rollback on failure.
 */

import "server-only";

import { UserRepo, InsufficientCreditsError } from "@/src/db/user.repo";

/**
 * Validate that user has sufficient credits
 *
 * @param userId - User identifier
 * @param count - Number of credits required (default: 1)
 * @throws {InsufficientCreditsError} If user has insufficient credits
 * @throws Error if user not found
 *
 * @example
 * ```ts
 * await requireCredits(userId, 1);
 * // Proceed with operation...
 * ```
 */
export async function requireCredits(userId: string, count = 1): Promise<void> {
  const currentCredits = await UserRepo.getCredits(userId);

  if (currentCredits < count) {
    throw new InsufficientCreditsError(userId, count, currentCredits);
  }
}

/**
 * Execute a function and consume credits only on success
 *
 * This function provides transactional behavior:
 * 1. Executes the provided async function (e.g., analysis pipeline)
 * 2. If successful, consumes the specified number of credits
 * 3. If function throws, credits are NOT consumed
 *
 * @param userId - User identifier
 * @param fn - Async function to execute (e.g., document analysis)
 * @param count - Number of credits to consume on success (default: 1)
 * @returns Result of the executed function
 * @throws {InsufficientCreditsError} If user has insufficient credits
 * @throws Error if user not found or function execution fails
 *
 * @example
 * ```ts
 * const result = await consumeOnSuccess(
 *   userId,
 *   async () => {
 *     // Perform document analysis
 *     return await analyzeDocument(fileBuffer);
 *   },
 *   1
 * );
 * // Credits consumed only if analysis succeeded
 * ```
 */
export async function consumeOnSuccess<T>(
  userId: string,
  fn: () => Promise<T>,
  count = 1
): Promise<T> {
  // 1. Validate sufficient credits first
  await requireCredits(userId, count);

  // 2. Execute the function
  let result: T;
  try {
    result = await fn();
  } catch (error) {
    // Function failed - DO NOT consume credits
    console.error(
      `[consumeOnSuccess] Function failed for user ${userId}, credits NOT consumed:`,
      error
    );
    throw error;
  }

  // 3. Function succeeded - consume credits
  try {
    await UserRepo.consumeCredits(userId, count);
  } catch (error) {
    // This should rarely happen since we validated credits earlier
    console.error(
      `[consumeOnSuccess] Failed to consume credits after successful operation:`,
      error
    );
    throw new Error("Operation succeeded but failed to deduct credits. Please contact support.");
  }

  return result;
}
