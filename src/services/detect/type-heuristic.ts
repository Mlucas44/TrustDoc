/**
 * Contract Type Detection - Heuristic Approach
 *
 * Fast, offline detection using keyword matching and pattern recognition.
 * Target performance: < 200ms for 5-10k characters.
 */

import "server-only";

import { CONTRACT_TYPE_ALIASES } from "@/src/schemas/detect";

import type { ContractType, HeuristicResult } from "@/src/schemas/detect";

/**
 * Discriminant keywords for each contract type (weighted)
 * Higher weight = more discriminant for this type
 */
const DISCRIMINANT_KEYWORDS: Record<ContractType, Record<string, number>> = {
  CGU: {
    // French
    utilisateur: 3,
    utilisateurs: 3,
    service: 2,
    services: 2,
    plateforme: 3,
    cookies: 3,
    "responsabilité limitée": 4,
    compte: 2,
    "données personnelles": 3,
    "propriété intellectuelle": 2,
    "acceptation des conditions": 4,
    // English
    user: 3,
    users: 3,
    platform: 3,
    "personal data": 3,
    "intellectual property": 2,
    "acceptance of terms": 4,
    "limited liability": 4,
    account: 2,
  },
  FREELANCE: {
    // French
    prestations: 4,
    prestation: 4,
    mission: 3,
    missions: 3,
    facturation: 3,
    indépendant: 3,
    livrables: 3,
    livrable: 3,
    honoraires: 3,
    "taux journalier": 4,
    freelance: 4,
    consultant: 3,
    "sous-traitant": 3,
    // English
    services: 2,
    deliverables: 3,
    invoice: 3,
    invoicing: 3,
    contractor: 4,
    "independent contractor": 5,
    "statement of work": 4,
    sow: 4,
    "daily rate": 4,
  },
  EMPLOI: {
    // French
    cdi: 5,
    cdd: 5,
    "période d'essai": 5,
    "periode d'essai": 5,
    salaire: 4,
    "congés payés": 5,
    "conges payes": 5,
    hiérarchie: 3,
    hierarchie: 3,
    employeur: 4,
    salarié: 4,
    salarie: 4,
    "convention collective": 4,
    "temps de travail": 3,
    "horaires de travail": 3,
    // English
    employment: 4,
    employee: 4,
    employer: 4,
    salary: 4,
    "paid leave": 4,
    "probation period": 5,
    "trial period": 5,
    "collective agreement": 4,
    "working hours": 3,
  },
  NDA: {
    // French
    confidentiel: 5,
    confidentialité: 5,
    confidentialite: 5,
    divulgation: 4,
    receveur: 3,
    émetteur: 3,
    emetteur: 3,
    "durée de confidentialité": 5,
    "duree de confidentialite": 5,
    "informations protégées": 4,
    "informations protegees": 4,
    secret: 3,
    // English
    confidential: 5,
    confidentiality: 5,
    disclosure: 4,
    "non-disclosure": 5,
    nda: 5,
    recipient: 3,
    discloser: 3,
    "protected information": 4,
    secrecy: 3,
  },
  DEVIS: {
    // French
    devis: 5,
    acceptation: 3,
    validité: 4,
    validite: 4,
    "prix ht": 4,
    "prix ttc": 4,
    acompte: 4,
    "bon de commande": 4,
    estimation: 3,
    montant: 2,
    quantité: 2,
    quantite: 2,
    // English
    quote: 5,
    quotation: 5,
    estimate: 4,
    "price quote": 5,
    "unit price": 3,
    quantity: 2,
    "purchase order": 4,
    deposit: 3,
    validity: 4,
  },
  PARTENARIAT: {
    // French
    partenariat: 5,
    coopération: 4,
    cooperation: 4,
    "joint marketing": 4,
    "exclusivité territoriale": 4,
    "exclusivite territoriale": 4,
    "sous-traitance": 3,
    collaboration: 3,
    partenaire: 4,
    "accord-cadre": 4,
    // English
    partnership: 5,
    partner: 4,
    "joint venture": 5,
    collaborationEn: 3,
    "strategic alliance": 5,
    "memorandum of understanding": 5,
    mou: 5,
    "territorial exclusivity": 4,
    subcontracting: 3,
  },
  AUTRE: {},
};

/**
 * Structural patterns for each contract type
 * Patterns that indicate document structure/clauses
 */
const STRUCTURAL_PATTERNS: Record<ContractType, RegExp[]> = {
  CGU: [
    /article\s+\d+\s*[:-]\s*utilisation/i,
    /article\s+\d+\s*[:-]\s*compte/i,
    /article\s+\d+\s*[:-]\s*données/i,
    /section\s+\d+\s*[:-]\s*acceptance/i,
  ],
  FREELANCE: [
    /article\s+\d+\s*[:-]\s*prestations/i,
    /article\s+\d+\s*[:-]\s*facturation/i,
    /article\s+\d+\s*[:-]\s*livrables/i,
    /clause\s+de\s+non[-\s]concurrence/i,
  ],
  EMPLOI: [
    /article\s+\d+\s*[:-]\s*période\s+d'essai/i,
    /article\s+\d+\s*[:-]\s*rémunération/i,
    /article\s+\d+\s*[:-]\s*remuneration/i,
    /article\s+\d+\s*[:-]\s*congés/i,
    /clause\s+de\s+non[-\s]concurrence/i,
  ],
  NDA: [
    /article\s+\d+\s*[:-]\s*confidentialité/i,
    /article\s+\d+\s*[:-]\s*confidentialite/i,
    /article\s+\d+\s*[:-]\s*divulgation/i,
    /durée\s+de\s+confidentialité/i,
    /duree\s+de\s+confidentialite/i,
  ],
  DEVIS: [
    /n°\s*devis/i,
    /numéro\s+de\s+devis/i,
    /numero\s+de\s+devis/i,
    /quote\s+number/i,
    /validité\s+du\s+devis/i,
    /validite\s+du\s+devis/i,
  ],
  PARTENARIAT: [
    /article\s+\d+\s*[:-]\s*objet\s+du\s+partenariat/i,
    /article\s+\d+\s*[:-]\s*coopération/i,
    /article\s+\d+\s*[:-]\s*cooperation/i,
    /exclusivité\s+territoriale/i,
    /exclusivite\s+territoriale/i,
  ],
  AUTRE: [],
};

/**
 * Detect contract type using heuristic approach
 *
 * @param text - Normalized contract text
 * @returns Heuristic detection result with type, confidence, evidence, and scores
 *
 * @example
 * ```ts
 * const result = detectTypeHeuristic(contractText);
 * // { type: "FREELANCE", confidence: 0.85, evidence: [...], scores: {...} }
 * ```
 */
export function detectTypeHeuristic(text: string): HeuristicResult {
  const startTime = performance.now();

  // Normalize text for matching (lowercase, preserve structure)
  const normalizedText = text.toLowerCase();

  // 1. Title/Header detection (highest weight)
  const titleType = detectFromTitle(normalizedText);
  if (titleType.confidence >= 0.9) {
    const duration = performance.now() - startTime;
    console.log(
      `[detectTypeHeuristic] Title detection: ${titleType.type} (${duration.toFixed(2)}ms)`
    );
    const evidence = extractEvidence(normalizedText, titleType.type, text);
    return {
      ...titleType,
      evidence,
      scores: { [titleType.type]: titleType.confidence } as Record<ContractType, number>,
    };
  }

  // 2. Keyword scoring
  const keywordScores = scoreByKeywords(normalizedText);

  // 3. Structural pattern matching
  const structuralScores = scoreByStructure(normalizedText);

  // 4. Combine scores (weighted average)
  const combinedScores: Record<string, number> = {};
  const types: ContractType[] = [
    "CGU",
    "FREELANCE",
    "EMPLOI",
    "NDA",
    "DEVIS",
    "PARTENARIAT",
    "AUTRE",
  ];

  for (const type of types) {
    const titleWeight = titleType.type === type ? 0.4 : 0;
    const keywordWeight = 0.5;
    const structuralWeight = 0.1;

    combinedScores[type] =
      titleWeight * (titleType.confidence || 0) +
      keywordWeight * (keywordScores[type] || 0) +
      structuralWeight * (structuralScores[type] || 0);
  }

  // Normalize scores to sum to 1
  const totalScore = Object.values(combinedScores).reduce((sum, score) => sum + score, 0);
  if (totalScore > 0) {
    for (const type of types) {
      combinedScores[type] = combinedScores[type] / totalScore;
    }
  }

  // Find best type
  let bestType: ContractType = "AUTRE";
  let bestScore = 0;

  for (const type of types) {
    if (combinedScores[type] > bestScore) {
      bestScore = combinedScores[type];
      bestType = type;
    }
  }

  // Extract evidence (sample keyword matches)
  const evidence = extractEvidence(normalizedText, bestType, text);

  const duration = performance.now() - startTime;
  console.log(
    `[detectTypeHeuristic] Detected ${bestType} with confidence ${bestScore.toFixed(2)} (${duration.toFixed(2)}ms)`
  );

  return {
    type: bestType,
    confidence: bestScore,
    evidence,
    scores: combinedScores as Record<ContractType, number>,
  };
}

/**
 * Detect contract type from title/headers
 */
function detectFromTitle(text: string): { type: ContractType; confidence: number } {
  // Extract first 500 chars (likely contains title)
  const titleSection = text.substring(0, 500);

  // Check for exact matches with aliases
  for (const [type, aliases] of Object.entries(CONTRACT_TYPE_ALIASES)) {
    for (const alias of aliases) {
      if (titleSection.includes(alias.toLowerCase())) {
        return { type: type as ContractType, confidence: 0.95 };
      }
    }
  }

  return { type: "AUTRE", confidence: 0 };
}

/**
 * Score contract types based on keyword frequency
 */
function scoreByKeywords(text: string): Record<string, number> {
  const scores: Record<string, number> = {};
  const types: ContractType[] = [
    "CGU",
    "FREELANCE",
    "EMPLOI",
    "NDA",
    "DEVIS",
    "PARTENARIAT",
    "AUTRE",
  ];

  for (const type of types) {
    let score = 0;
    const keywords = DISCRIMINANT_KEYWORDS[type];

    for (const [keyword, weight] of Object.entries(keywords)) {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) {
        score += matches.length * weight;
      }
    }

    scores[type] = score;
  }

  // Normalize scores
  const maxScore = Math.max(...Object.values(scores), 1);
  for (const type of types) {
    scores[type] = scores[type] / maxScore;
  }

  return scores;
}

/**
 * Score contract types based on structural patterns
 */
function scoreByStructure(text: string): Record<string, number> {
  const scores: Record<string, number> = {};
  const types: ContractType[] = [
    "CGU",
    "FREELANCE",
    "EMPLOI",
    "NDA",
    "DEVIS",
    "PARTENARIAT",
    "AUTRE",
  ];

  for (const type of types) {
    let matches = 0;
    const patterns = STRUCTURAL_PATTERNS[type];

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matches++;
      }
    }

    scores[type] = patterns.length > 0 ? matches / patterns.length : 0;
  }

  return scores;
}

/**
 * Extract evidence (short excerpts) showing why this type was detected
 */
function extractEvidence(
  normalizedText: string,
  type: ContractType,
  originalText: string
): string[] {
  const evidence: string[] = [];
  const keywords = DISCRIMINANT_KEYWORDS[type];

  // Find top 3-5 keyword matches with context
  const keywordList = Object.entries(keywords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([kw]) => kw);

  for (const keyword of keywordList) {
    const regex = new RegExp(`(.{0,50}\\b${keyword}\\b.{0,50})`, "i");
    const match = originalText.match(regex);

    if (match && match[1]) {
      const excerpt = match[1].trim().substring(0, 150);
      if (!evidence.includes(excerpt)) {
        evidence.push(excerpt);
      }
    }

    if (evidence.length >= 5) break;
  }

  return evidence;
}
