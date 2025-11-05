/**
 * Structured logging events for TrustDoc business operations
 *
 * This module provides type-safe event loggers for key business operations:
 * - Analysis pipeline (started, prepared, detected, completed)
 * - LLM operations (completion, retries, duration)
 * - Credits/quota management (debited, incremented)
 * - Billing operations (Stripe events)
 *
 * All events follow privacy-by-design principles:
 * - No contract text or PII in logs
 * - Only metadata (IDs, counts, durations)
 * - Automatic sanitization via logger
 */

import "server-only";

import { logger } from "./logger";

import type { ContractType } from "@/src/schemas/detect";

/**
 * Analysis Started Event
 *
 * Logged when an analysis request is initiated
 */
export function logAnalysisStarted(params: {
  requestId: string;
  userType: "user" | "guest";
  userId?: string;
  guestId?: string;
  fileId: string;
  idempotencyKey?: string;
  contractType?: ContractType;
  textLength?: number;
}): void {
  logger.info("analysis.started", {
    requestId: params.requestId,
    userType: params.userType,
    userId: params.userId,
    guestId: params.guestId,
    fileId: params.fileId,
    idempotencyKey: params.idempotencyKey,
    contractType: params.contractType,
    textLength: params.textLength,
    t0: Date.now(),
  });
}

/**
 * Analysis Prepared Event
 *
 * Logged after PDF parsing and text preparation
 */
export function logAnalysisPrepared(params: {
  requestId: string;
  fileId?: string;
  pages: number;
  textLengthRaw?: number;
  textLengthClean?: number;
  textLength?: number;
  textTokensApprox?: number;
  durationMs?: number;
}): void {
  logger.info("analysis.prepared", {
    requestId: params.requestId,
    fileId: params.fileId,
    pages: params.pages,
    textLengthRaw: params.textLengthRaw,
    textLengthClean: params.textLengthClean,
    textLength: params.textLength,
    textTokensApprox: params.textTokensApprox,
    durationMs: params.durationMs,
  });
}

/**
 * Contract Type Detected Event
 *
 * Logged after contract type detection
 */
export function logContractDetected(params: {
  requestId: string;
  fileId: string;
  contractType: ContractType;
  confidence?: number;
  durationMs?: number;
}): void {
  logger.info("analysis.detected", {
    requestId: params.requestId,
    fileId: params.fileId,
    contractType: params.contractType,
    confidence: params.confidence,
    durationMs: params.durationMs,
  });
}

/**
 * LLM Analysis Completed Event
 *
 * Logged after successful LLM analysis (without payload)
 */
export function logLLMCompleted(params: {
  requestId: string;
  provider: "openai" | "ollama" | string;
  model?: string;
  retries: number;
  durationMs: number;
  tokenUsage?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
}): void {
  logger.info("analysis.llm.completed", {
    requestId: params.requestId,
    provider: params.provider,
    model: params.model,
    retries: params.retries,
    durationMs: params.durationMs,
    tokenUsage: params.tokenUsage,
  });
}

/**
 * LLM Analysis Failed Event
 *
 * Logged when LLM analysis fails after retries
 */
export function logLLMFailed(params: {
  requestId: string;
  provider: string;
  error: string;
  retries: number;
  durationMs: number;
}): void {
  logger.error("analysis.llm.failed", {
    requestId: params.requestId,
    provider: params.provider,
    error: params.error,
    retries: params.retries,
    durationMs: params.durationMs,
  });
}

/**
 * Analysis Persisted Event
 *
 * Logged after analysis is saved to database
 */
export function logAnalysisPersisted(params: {
  requestId: string;
  analysisId: string;
  userId?: string;
  guestId?: string;
  riskScore: number;
  redFlagsCount: number;
  clausesCount: number;
  durationMs?: number;
}): void {
  logger.info("analysis.persisted", {
    requestId: params.requestId,
    analysisId: params.analysisId,
    userId: params.userId,
    guestId: params.guestId,
    riskScore: params.riskScore,
    redFlagsCount: params.redFlagsCount,
    clausesCount: params.clausesCount,
    durationMs: params.durationMs,
  });
}

/**
 * Analysis Completed Event
 *
 * Logged when entire analysis pipeline completes
 */
export function logAnalysisCompleted(params: {
  requestId: string;
  analysisId?: string;
  riskScore?: number;
  redFlagsCount?: number;
  clausesCount?: number;
  durationMs?: number;
  totalMs?: number;
  success?: boolean;
}): void {
  logger.info("analysis.completed", {
    requestId: params.requestId,
    analysisId: params.analysisId,
    riskScore: params.riskScore,
    redFlagsCount: params.redFlagsCount,
    clausesCount: params.clausesCount,
    durationMs: params.durationMs,
    totalMs: params.totalMs,
    success: params.success ?? true,
  });
}

/**
 * Analysis Failed Event
 *
 * Logged when analysis pipeline fails
 */
export function logAnalysisFailed(params: {
  requestId: string;
  reason?: string;
  error?: string;
  stage?: "parse" | "prepare" | "detect" | "analyze" | "persist";
  provider?: string;
  textLength?: number;
  durationMs?: number;
  totalMs?: number;
}): void {
  logger.error("analysis.failed", {
    requestId: params.requestId,
    reason: params.reason,
    error: params.error || params.reason,
    stage: params.stage,
    provider: params.provider,
    textLength: params.textLength,
    durationMs: params.durationMs,
    totalMs: params.totalMs || params.durationMs,
  });
}

/**
 * Credits Debited Event
 *
 * Logged when user credits are consumed
 */
export function logCreditsDebited(params: {
  requestId: string;
  userId: string;
  delta: number;
  remaining: number;
  reason: string;
}): void {
  logger.info("credits.debited", {
    requestId: params.requestId,
    userId: params.userId,
    delta: params.delta,
    remaining: params.remaining,
    reason: params.reason,
  });
}

/**
 * Guest Quota Incremented Event
 *
 * Logged when guest quota is consumed
 */
export function logGuestQuotaIncremented(params: {
  requestId: string;
  guestId: string;
  used: number;
  limit: number;
}): void {
  logger.info("guest.quota.incremented", {
    requestId: params.requestId,
    guestId: params.guestId,
    used: params.used,
    limit: params.limit,
  });
}

/**
 * Stripe Credits Added Event
 *
 * Logged when credits are added via Stripe payment
 */
export function logStripeCreditsAdded(params: {
  userId: string;
  creditsAdded: number;
  totalCredits: number;
  eventId: string;
  sessionId: string;
}): void {
  logger.info("stripe.credited", {
    userId: params.userId,
    creditsAdded: params.creditsAdded,
    totalCredits: params.totalCredits,
    eventId: params.eventId,
    sessionId: params.sessionId,
  });
}

/**
 * Stripe Webhook Received Event
 *
 * Logged when Stripe webhook is received
 */
export function logStripeWebhookReceived(params: {
  eventId: string;
  eventType: string;
  processed?: boolean;
}): void {
  logger.info("stripe.webhook.received", {
    eventId: params.eventId,
    eventType: params.eventType,
    processed: params.processed ?? false,
  });
}

/**
 * Stripe Webhook Failed Event
 *
 * Logged when Stripe webhook processing fails
 */
export function logStripeWebhookFailed(params: {
  reason?: string;
  error?: string;
  eventId?: string;
  eventType?: string;
  sessionId?: string;
  userId?: string;
  priceId?: string;
}): void {
  logger.error("stripe.webhook.failed", {
    reason: params.reason,
    error: params.error || params.reason,
    eventId: params.eventId,
    eventType: params.eventType,
    sessionId: params.sessionId,
    userId: params.userId,
    priceId: params.priceId,
  });
}

/**
 * Upload Started Event
 *
 * Logged when file upload begins
 */
export function logUploadStarted(params: {
  requestId: string;
  userType: "user" | "guest";
  userId?: string;
  guestId?: string;
  filename: string;
  fileSize?: number;
  size?: number;
  fileType?: string;
  mimeType?: string;
}): void {
  logger.info("upload.started", {
    requestId: params.requestId,
    userType: params.userType,
    userId: params.userId,
    guestId: params.guestId,
    filename: params.filename,
    size: params.size || params.fileSize,
    mimeType: params.mimeType || params.fileType,
  });
}

/**
 * Upload Completed Event
 *
 * Logged when file upload succeeds
 */
export function logUploadCompleted(params: {
  requestId: string;
  fileId: string;
  filename?: string;
  fileSize?: number;
  storagePath?: string;
  durationMs: number;
}): void {
  logger.info("upload.completed", {
    requestId: params.requestId,
    fileId: params.fileId,
    filename: params.filename,
    size: params.fileSize,
    storagePath: params.storagePath,
    durationMs: params.durationMs,
  });
}

/**
 * Upload Failed Event
 *
 * Logged when file upload fails
 */
export function logUploadFailed(params: {
  requestId: string;
  reason?: string;
  error?: string;
  fileSize?: number;
  fileType?: string;
  durationMs?: number;
}): void {
  logger.error("upload.failed", {
    requestId: params.requestId,
    reason: params.reason,
    error: params.error || params.reason,
    fileSize: params.fileSize,
    fileType: params.fileType,
    durationMs: params.durationMs,
  });
}
