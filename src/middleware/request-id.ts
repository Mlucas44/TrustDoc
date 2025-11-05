/**
 * Request ID Middleware
 *
 * Injects a unique request ID (UUID v4) into each API request for log correlation.
 * Uses x-request-id header if provided, otherwise generates a new ID.
 *
 * Usage in API routes:
 * ```typescript
 * import { getRequestId } from '@/src/middleware/request-id';
 *
 * export async function POST(request: NextRequest) {
 *   const requestId = getRequestId(request);
 *   const logger = createLogger({ requestId });
 *   // ...
 * }
 * ```
 */

import "server-only";

import { type NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

/**
 * Header name for request ID
 */
export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Symbol for storing request ID in request context
 * (Used internally by Next.js request caching)
 */
const REQUEST_ID_SYMBOL = Symbol.for("trustdoc.requestId");

/**
 * Get or generate request ID from request
 *
 * Priority:
 * 1. x-request-id header (if valid UUID)
 * 2. Generate new UUID v4
 *
 * @param request - Next.js request object
 * @returns Request ID (UUID v4)
 */
export function getRequestId(request: NextRequest): string {
  // Check if already set in request context
  const cached = (request as unknown as Record<symbol, string>)[REQUEST_ID_SYMBOL];
  if (cached) {
    return cached;
  }

  // Try to get from header
  const headerValue = request.headers.get(REQUEST_ID_HEADER);
  if (headerValue && isValidUuid(headerValue)) {
    const requestId = headerValue;
    (request as unknown as Record<symbol, string>)[REQUEST_ID_SYMBOL] = requestId;
    return requestId;
  }

  // Generate new UUID
  const requestId = uuidv4();
  (request as unknown as Record<symbol, string>)[REQUEST_ID_SYMBOL] = requestId;
  return requestId;
}

/**
 * Validate UUID format (basic validation)
 */
function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Create response headers with request ID
 */
export function getRequestIdHeaders(requestId: string): Record<string, string> {
  return {
    [REQUEST_ID_HEADER]: requestId,
  };
}
