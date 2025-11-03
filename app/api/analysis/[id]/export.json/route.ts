/**
 * JSON Export Endpoint
 *
 * GET /api/analysis/[id]/export.json
 * Exports analysis as JSON with ownership verification.
 */

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/src/auth/current-user";
import { AnalysisRepo } from "@/src/db/analysis.repo";
import { slugifyFilename, toExportAnalysis } from "@/src/lib/export-utils";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Fetch analysis
    const analysis = await AnalysisRepo.getById(id);

    if (!analysis || analysis.userId !== user.id) {
      return NextResponse.json({ error: "Analyse introuvable" }, { status: 404 });
    }

    // Convert to export format
    const exportData = toExportAnalysis(analysis);

    // Create slugified filename
    const slug = slugifyFilename(analysis.filename);
    const filename = `trustdoc-${id}-${slug}.json`;

    // Return JSON with proper headers
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[JSON Export Error]", error);
    return NextResponse.json({ error: "Erreur lors de l'export" }, { status: 500 });
  }
}
