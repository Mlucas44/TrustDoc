/**
 * Privacy-by-design structured logger for TrustDoc
 *
 * Features:
 * - JSON logs in production, pretty logs in development
 * - Automatic PII redaction (emails, IP addresses, secrets)
 * - Request ID correlation
 * - Level-based filtering (info, warn, error)
 * - Forbidden fields protection (contract text, API keys)
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/src/lib/logger';
 *
 * logger.info('analysis.started', {
 *   userType: 'user',
 *   userId: 'abc123',
 *   fileId: 'xyz789',
 * });
 * ```
 */

import "server-only";

import crypto from "crypto";

/**
 * Log levels
 */
export type LogLevel = "info" | "warn" | "error";

/**
 * Log entry structure
 */
export interface LogEntry {
  /** ISO timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Service name */
  service: string;
  /** Environment */
  env: string;
  /** Event name (e.g., 'analysis.started') */
  event: string;
  /** Request ID for correlation */
  requestId?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** Pretty print for development */
  pretty: boolean;
  /** Silent mode for tests */
  silent: boolean;
  /** Service name */
  service: string;
  /** Environment */
  env: string;
}

/**
 * Forbidden fields that should never be logged
 */
const FORBIDDEN_FIELDS = new Set([
  "textClean",
  "textRaw",
  "contractText",
  "pdfContent",
  "apiKey",
  "secretKey",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "privateKey",
]);

/**
 * PII fields that need redaction
 */
const PII_FIELDS = new Set(["email", "ip", "ipAddress"]);

/**
 * Get logger configuration from environment
 */
function getConfig(): LoggerConfig {
  const level = (process.env.LOG_LEVEL?.toLowerCase() || "info") as LogLevel;
  const pretty = process.env.LOG_PRETTY === "1" || process.env.NODE_ENV === "development";
  const silent = process.env.LOG_SILENT_TEST === "1" && process.env.NODE_ENV === "test";

  return {
    level,
    pretty,
    silent,
    service: "trustdoc-web",
    env: process.env.NODE_ENV || "development",
  };
}

const config = getConfig();

/**
 * Log level priorities
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  info: 0,
  warn: 1,
  error: 2,
};

/**
 * Hash email for privacy (partial SHA-256)
 */
function hashEmail(email: string): string {
  const hash = crypto.createHash("sha256").update(email).digest("hex");
  const [user, domain] = email.split("@");
  const maskedUser = user[0] + "***";
  const maskedDomain = domain ? `${domain[0]}***.${domain.split(".").pop()}` : "";
  return `${maskedUser}@${maskedDomain} (${hash.substring(0, 8)})`;
}

/**
 * Redact PII from a value
 */
function redactPII(key: string, value: unknown): unknown {
  if (PII_FIELDS.has(key)) {
    if (typeof value === "string") {
      if (key === "email") {
        return hashEmail(value);
      }
      // For IP addresses, don't log them at all
      if (key === "ip" || key === "ipAddress") {
        return "[REDACTED]";
      }
    }
  }
  return value;
}

/**
 * Sanitize log data by removing forbidden fields and redacting PII
 */
export function sanitizeLog(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip forbidden fields
    if (FORBIDDEN_FIELDS.has(key)) {
      sanitized[key] = "[FORBIDDEN]";
      continue;
    }

    // Redact PII
    sanitized[key] = redactPII(key, value);
  }

  return sanitized;
}

/**
 * Format log entry for output
 */
function formatLog(entry: LogEntry): string {
  if (config.pretty) {
    // Pretty format for development
    const { timestamp, level, service, env, event, requestId, ...rest } = entry;
    const levelColor = level === "error" ? "\x1b[31m" : level === "warn" ? "\x1b[33m" : "\x1b[36m";
    const reset = "\x1b[0m";
    const time = new Date(timestamp).toLocaleTimeString();

    let message = `${levelColor}[${level.toUpperCase()}]${reset} ${time} ${event}`;
    if (requestId) {
      message += ` (req:${requestId.substring(0, 8)})`;
    }

    if (Object.keys(rest).length > 0) {
      message += `\n  ${JSON.stringify(rest, null, 2).replace(/\n/g, "\n  ")}`;
    }

    return message;
  }

  // JSON format for production
  return JSON.stringify(entry);
}

/**
 * Check if log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[config.level];
}

/**
 * Core logging function
 */
function log(level: LogLevel, event: string, data: Record<string, unknown> = {}): void {
  if (config.silent && level !== "error") {
    return;
  }

  if (!shouldLog(level)) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: config.service,
    env: config.env,
    event,
    ...sanitizeLog(data),
  };

  const formatted = formatLog(entry);

  // Output to appropriate stream
  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.info(formatted);
  }
}

/**
 * Logger type
 */
export interface Logger {
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
  child(context: { requestId?: string }): Logger;
}

/**
 * Create a logger instance with optional context
 */
function createLogger(context: Record<string, unknown> = {}): Logger {
  return {
    info: (event: string, data: Record<string, unknown> = {}) =>
      log("info", event, { ...context, ...data }),
    warn: (event: string, data: Record<string, unknown> = {}) =>
      log("warn", event, { ...context, ...data }),
    error: (event: string, data: Record<string, unknown> = {}) =>
      log("error", event, { ...context, ...data }),
    child: (childContext: { requestId?: string }) => createLogger({ ...context, ...childContext }),
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Utility to measure execution time and log
 */
export async function timeIt<T>(
  label: string,
  fn: () => Promise<T>,
  context: Record<string, unknown> = {}
): Promise<T> {
  const t0 = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - t0);
    logger.info(label, { ...context, durationMs });
    return result;
  } catch (error) {
    const durationMs = Math.round(performance.now() - t0);
    logger.error(`${label}.failed`, {
      ...context,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
