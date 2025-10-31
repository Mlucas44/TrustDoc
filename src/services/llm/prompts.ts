/**
 * LLM Prompts for Contract Analysis
 *
 * Optimized prompts with strict JSON schema enforcement.
 */

import "server-only";

import type { ContractType } from "@/src/schemas/detect";

/**
 * Clause types to extract based on contract type
 */
const CLAUSE_TYPES_BY_CONTRACT: Record<ContractType, string[]> = {
  CGU: [
    "Objet du service",
    "Acceptation des conditions",
    "Données personnelles & RGPD",
    "Propriété intellectuelle",
    "Responsabilité limitée",
    "Résiliation & suspension",
    "Modification des CGU",
    "Droit applicable & juridiction",
  ],
  FREELANCE: [
    "Objet de la mission",
    "Durée & renouvellement",
    "Rémunération & facturation",
    "Livrables attendus",
    "Propriété intellectuelle",
    "Confidentialité",
    "Résiliation",
    "Non-concurrence",
  ],
  EMPLOI: [
    "Poste & fonction",
    "Durée du contrat (CDI/CDD)",
    "Période d'essai",
    "Rémunération & avantages",
    "Temps de travail & horaires",
    "Congés payés",
    "Clause de mobilité",
    "Non-concurrence",
    "Résiliation & préavis",
  ],
  NDA: [
    "Définition des informations confidentielles",
    "Obligations du receveur",
    "Exceptions à la confidentialité",
    "Durée de confidentialité",
    "Restitution des informations",
    "Sanctions en cas de violation",
    "Droit applicable",
  ],
  DEVIS: [
    "Désignation des prestations",
    "Prix & modalités de paiement",
    "Validité du devis",
    "Conditions d'acceptation",
    "Délais de réalisation",
    "Conditions d'annulation",
    "Garanties",
  ],
  PARTENARIAT: [
    "Objet du partenariat",
    "Durée & renouvellement",
    "Obligations de chaque partie",
    "Exclusivité territoriale",
    "Propriété intellectuelle",
    "Confidentialité",
    "Résiliation",
    "Responsabilités",
  ],
  AUTRE: [
    "Objet du contrat",
    "Parties contractantes",
    "Durée",
    "Obligations principales",
    "Résiliation",
    "Droit applicable",
  ],
};

/**
 * System prompt for contract analysis
 */
const SYSTEM_PROMPT = `You are a pedagogical legal assistant specialized in contract analysis.

**Important Rules:**
1. You are NOT a lawyer and cannot provide legal advice
2. Your role is educational: help users understand contract risks
3. Output ONLY valid JSON, no additional text
4. If output does not validate against the schema, you will be re-prompted

**Output Schema:**
{
  "summary": ["bullet point 1", "bullet point 2", ...],  // 3-10 points
  "riskScore": 0-100,  // integer
  "riskJustification": "explanation...",  // 20-1000 chars
  "redFlags": [
    {
      "title": "brief title",
      "severity": "low" | "medium" | "high",
      "why": "explanation...",
      "clause_excerpt": "exact text from contract..."
    }
  ],
  "clauses": [
    {
      "type": "clause category",
      "text": "clause content..."
    }
  ]
}`;

/**
 * Generate analysis prompt for a contract
 *
 * @param contractType - Detected contract type
 * @param textClean - Normalized contract text
 * @returns User prompt for LLM
 */
export function analysisPrompt(contractType: ContractType, textClean: string): string {
  const clauseTypes = CLAUSE_TYPES_BY_CONTRACT[contractType];

  return `Analyze the following ${contractType} contract and produce a JSON response.

**Contract Text:**
${textClean}

**Instructions:**

1. **Summary** (5-8 bullet points):
   - Clear, concise key points
   - Focus on main obligations and rights
   - Use simple language

2. **Risk Score** (0-100):
   - 0-30: Low risk (fair, balanced)
   - 31-60: Medium risk (some unfavorable clauses)
   - 61-100: High risk (very unfavorable, potential traps)

3. **Risk Justification**:
   - Explain why this score
   - Mention 2-3 main factors
   - 20-1000 characters

4. **Red Flags** (0-N):
   - Identify problematic clauses
   - Severity: low/medium/high
   - Include exact excerpt from contract
   - Focus on: unfair terms, hidden fees, auto-renewal, liability exclusions, data misuse

5. **Clauses** (extract these types):
${clauseTypes.map((type) => `   - ${type}`).join("\n")}
   - Include exact text from contract
   - If clause not found, skip it

**Example Output:**
{
  "summary": [
    "Contrat de prestation de services entre freelance et client",
    "Mission limitée à 3 mois renouvelable",
    "Rémunération forfaitaire de 5000€ HT",
    "Propriété intellectuelle transférée au client",
    "Clause de confidentialité standard"
  ],
  "riskScore": 45,
  "riskJustification": "Score modéré dû à une clause de résiliation unilatérale par le client sans préavis et absence de clause de pénalités en cas de retard de paiement.",
  "redFlags": [
    {
      "title": "Résiliation unilatérale sans préavis",
      "severity": "medium",
      "why": "Le client peut résilier à tout moment sans justification ni préavis, exposant le freelance à une perte de revenus brutale.",
      "clause_excerpt": "Le Client pourra résilier le présent contrat à tout moment par simple notification écrite."
    }
  ],
  "clauses": [
    {
      "type": "Objet de la mission",
      "text": "Le Prestataire s'engage à réaliser pour le Client..."
    },
    {
      "type": "Rémunération & facturation",
      "text": "La rémunération est fixée à 5000€ HT payable..."
    }
  ]
}

Produce ONLY the JSON response, no additional text.`;
}

/**
 * Repair prompt when LLM output is invalid
 *
 * @param invalidOutput - The invalid JSON output
 * @param validationErrors - Zod validation errors
 * @returns Repair prompt
 */
export function repairPrompt(invalidOutput: string, validationErrors: string[]): string {
  return `Your last output did not match the required schema.

**Validation Errors:**
${validationErrors.map((err, i) => `${i + 1}. ${err}`).join("\n")}

**Your Invalid Output:**
${invalidOutput}

**Required Schema:**
{
  "summary": string[],           // 3-10 items, each 10-500 chars
  "riskScore": number,            // integer 0-100
  "riskJustification": string,    // 20-1000 chars
  "redFlags": [
    {
      "title": string,            // 1-200 chars
      "severity": "low" | "medium" | "high",
      "why": string,              // 10-1000 chars
      "clause_excerpt": string    // 10-500 chars
    }
  ],
  "clauses": [
    {
      "type": string,             // 1-100 chars
      "text": string              // 10-2000 chars
    }
  ]
}

Fix the output to match this schema EXACTLY. Produce ONLY the corrected JSON, no additional text.`;
}

/**
 * Get system prompt for analysis
 */
export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}
