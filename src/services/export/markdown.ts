/**
 * Markdown Export Generator
 *
 * Generates Markdown documents from analysis data.
 */

import type { ExportAnalysis } from "@/src/types/export";

/**
 * Get risk badge for Markdown
 */
function getRiskBadge(riskScore: number): string {
  if (riskScore >= 75) return "🔴 Critique";
  if (riskScore >= 50) return "🟠 Élevé";
  if (riskScore >= 25) return "🟡 Modéré";
  return "🟢 Faible";
}

/**
 * Get severity label for red flags
 */
function getSeverityLabel(severity: number): string {
  if (severity >= 3) return "Critique";
  if (severity >= 2) return "Élevée";
  return "Modérée";
}

/**
 * Escape backticks in text for Markdown
 */
function escapeBackticks(text: string): string {
  return text.replace(/`/g, "\\`");
}

/**
 * Generate Markdown document from analysis
 *
 * @param analysis - Export analysis data
 * @returns Markdown string with LF line endings
 */
export function generateMarkdown(analysis: ExportAnalysis): string {
  const lines: string[] = [];

  // Title
  lines.push(`# Analyse TrustDoc - ${escapeBackticks(analysis.filename)}`);
  lines.push("");

  // Metadata
  lines.push("## Métadonnées");
  lines.push("");
  lines.push("| Champ | Valeur |");
  lines.push("|-------|--------|");
  lines.push(`| **ID** | \`${analysis.id}\` |`);
  lines.push(`| **Fichier** | ${escapeBackticks(analysis.filename)} |`);
  lines.push(
    `| **Date d'analyse** | ${new Date(analysis.createdAt).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })} |`
  );
  lines.push(`| **Type de contrat** | ${escapeBackticks(analysis.typeContrat)} |`);
  lines.push(
    `| **Score de risque** | ${analysis.riskScore}/100 ${getRiskBadge(analysis.riskScore)} |`
  );
  lines.push("");

  // Summary
  if (analysis.summary) {
    lines.push("## Résumé");
    lines.push("");
    const summaryPoints = analysis.summary
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    summaryPoints.forEach((point) => {
      lines.push(`- ${escapeBackticks(point)}`);
    });
    lines.push("");
  }

  // Risk Score Section
  lines.push("## Évaluation du risque");
  lines.push("");
  lines.push(`**Score:** ${analysis.riskScore}/100 ${getRiskBadge(analysis.riskScore)}`);
  lines.push("");

  if (analysis.riskJustification) {
    lines.push("**Justification:**");
    lines.push("");
    lines.push(escapeBackticks(analysis.riskJustification));
    lines.push("");
  }

  // Red Flags
  if (analysis.redFlags.length > 0) {
    lines.push("## Points d'attention (Red Flags)");
    lines.push("");
    lines.push("| Catégorie | Description | Gravité |");
    lines.push("|-----------|-------------|---------|");

    analysis.redFlags.forEach((flag) => {
      lines.push(
        `| ${escapeBackticks(flag.category)} | ${escapeBackticks(flag.description)} | ${getSeverityLabel(flag.severity)} |`
      );
    });
    lines.push("");
  } else {
    lines.push("## Points d'attention (Red Flags)");
    lines.push("");
    lines.push("*Aucun point d'attention détecté.*");
    lines.push("");
  }

  // Clauses
  if (analysis.clauses.length > 0) {
    lines.push("## Clauses clés");
    lines.push("");

    analysis.clauses.forEach((clause, index) => {
      lines.push(`### ${index + 1}. ${escapeBackticks(clause.type)}`);
      lines.push("");
      lines.push(escapeBackticks(clause.text));
      lines.push("");
    });
  } else {
    lines.push("## Clauses clés");
    lines.push("");
    lines.push("*Aucune clause clé extraite.*");
    lines.push("");
  }

  // Footer
  lines.push("---");
  lines.push("");
  lines.push("*Document généré par TrustDoc - Plateforme d'analyse contractuelle*");
  lines.push("");
  lines.push(
    "**Avertissement:** Cette analyse est fournie à titre informatif uniquement et ne constitue pas un avis juridique. Consultez un professionnel du droit pour toute question spécifique."
  );
  lines.push("");

  // Join with LF
  return lines.join("\n");
}
