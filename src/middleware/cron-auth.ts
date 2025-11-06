/**
 * CRON Authentication Middleware
 *
 * Validates CRON job requests using CRON_SECRET header.
 * Prevents unauthorized access to cleanup and maintenance endpoints.
 *
 * Usage in API routes:
 * ```typescript
 * import { validateCronRequest } from '@/src/middleware/cron-auth';
 *
 * export async function POST(request: NextRequest) {
 *   const authError = validateCronRequest(request);
 *   if (authError) {
 *     return authError;
 *   }
 *   // ... continue with CRON job logic
 * }
 * ```
 */

import "server-only";

import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/src/env";

/**
 * Header name for CRON authentication
 */
export const CRON_SECRET_HEADER = "x-cron-secret";

/**
 * Validate CRON request authentication
 *
 * @param request - Next.js request object
 * @returns NextResponse with 401 if invalid, null if valid
 */
export function validateCronRequest(request: NextRequest): NextResponse | null {
  // Check if CRON_SECRET is configured
  if (!env.server.CRON_SECRET) {
    return NextResponse.json(
      {
        error: "CRON jobs are not configured on this server",
        code: "CRON_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const secret = request.headers.get(CRON_SECRET_HEADER);

  if (!secret) {
    return NextResponse.json(
      {
        error: "Missing CRON authentication header",
        code: "CRON_AUTH_MISSING",
      },
      { status: 401 }
    );
  }

  if (secret !== env.server.CRON_SECRET) {
    return NextResponse.json(
      {
        error: "Invalid CRON authentication",
        code: "CRON_AUTH_INVALID",
      },
      { status: 401 }
    );
  }

  return null;
}
