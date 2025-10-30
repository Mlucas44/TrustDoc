/**
 * POST /api/detect-type
 *
 * Detect contract type from normalized text.
 * Uses hybrid approach (heuristic + LLM).
 * - Validates textClean format
 * - Detects contract type (CGU, FREELANCE, EMPLOI, NDA, DEVIS, PARTENARIAT, AUTRE)
 * - Returns type, confidence, source, evidence, and reason
 */

import { type NextRequest, NextResponse } from "next/server";

import { DetectionResultSchema } from "@/src/schemas/detect";
import { detectContractType } from "@/src/services/detect/contract-type";

export const runtime = "nodejs";

/**
 * POST /api/detect-type
 *
 * Detect contract type from normalized text
 *
 * @body { textClean: string } - Normalized contract text
 * @returns { type, confidence, source, evidence, reason }
 *
 * @errors
 * - 400 Bad Request: Missing or invalid textClean
 * - 422 Unprocessable Entity: Text too short (< 200 chars)
 * - 500 Internal Server Error: Detection failed
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    let body: { textClean?: string };
    try {
      body = await request.json();
    } catch (error) {
      console.error("[POST /api/detect-type] Failed to parse JSON:", error);
      return NextResponse.json(
        {
          error: "Invalid request body. Expected JSON with textClean",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    // 2. Validate textClean
    const { textClean } = body;

    if (!textClean || typeof textClean !== "string") {
      return NextResponse.json(
        {
          error: "Missing or invalid textClean. Expected string",
          code: "MISSING_TEXT_CLEAN",
        },
        { status: 400 }
      );
    }

    // Validate minimum length
    if (textClean.length < 200) {
      return NextResponse.json(
        {
          error: "Text too short for reliable detection (min 200 chars)",
          code: "TEXT_TOO_SHORT",
          length: textClean.length,
        },
        { status: 422 }
      );
    }

    // 3. Detect contract type
    let detectionResult;
    try {
      detectionResult = await detectContractType(textClean);
    } catch (error) {
      console.error("[POST /api/detect-type] Detection failed:", error);
      return NextResponse.json(
        {
          error: "Contract type detection failed",
          code: "DETECTION_FAILED",
        },
        { status: 500 }
      );
    }

    // 4. Validate detection result schema
    try {
      DetectionResultSchema.parse(detectionResult);
    } catch (error) {
      console.error("[POST /api/detect-type] Invalid detection result schema:", error);
      return NextResponse.json(
        {
          error: "Detection returned invalid result",
          code: "INVALID_DETECTION_RESULT",
        },
        { status: 500 }
      );
    }

    // 5. Log success (dev only)
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(`[POST /api/detect-type] Success:`, {
        type: detectionResult.type,
        confidence: detectionResult.confidence,
        source: detectionResult.source,
      });
    }

    // 6. Return success response (without document content)
    return NextResponse.json(
      {
        type: detectionResult.type,
        confidence: detectionResult.confidence,
        source: detectionResult.source,
        evidence: detectionResult.evidence, // Short excerpts only (≤ 200 chars each)
        reason: detectionResult.reason,
      },
      { status: 200 }
    );
  } catch (error) {
    // Catch-all error handler
    console.error("[POST /api/detect-type] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
