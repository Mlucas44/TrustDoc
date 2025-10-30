/**
 * Text Normalization Service
 *
 * Cleans and normalizes extracted PDF text for LLM processing.
 * - Removes headers/footers and page artifacts
 * - Normalizes spaces, line breaks, and encoding
 * - Joins hyphenated words across line breaks
 * - Detects headings and document structure
 * - Produces clean, ready-to-use text for AI analysis
 */

import "server-only";

/**
 * Heading structure
 */
export interface Heading {
  level: 1 | 2 | 3;
  text: string;
  index: number;
}

/**
 * Text normalization stats
 */
export interface NormalizationStats {
  pages: number;
  textLengthRaw: number;
  textLengthClean: number;
  removedHeaderFooterRatio: number;
  hyphenJoins: number;
  linesMerged: number;
  truncated?: boolean;
}

/**
 * Document sections (lightweight segmentation)
 */
export interface DocumentSections {
  title?: string;
  headings: Heading[];
}

/**
 * Normalization input
 */
export interface NormalizeInput {
  textRaw: string;
  pages: number;
  meta?: Record<string, string>;
}

/**
 * Normalization result
 */
export interface NormalizeResult {
  textClean: string;
  textTokensApprox: number;
  stats: NormalizationStats;
  sections?: DocumentSections;
}

/**
 * Maximum text length (200k characters)
 */
const MAX_TEXT_LENGTH = 200_000;

/**
 * Minimum text length after cleanup
 */
const MIN_TEXT_LENGTH_AFTER_CLEANUP = 200;

/**
 * Custom error for text too short after cleanup
 */
export class TextTooShortError extends Error {
  constructor(public readonly length: number) {
    super(
      `Text too short after cleanup: ${length} characters (minimum: ${MIN_TEXT_LENGTH_AFTER_CLEANUP})`
    );
    this.name = "TextTooShortError";
  }
}

/**
 * Normalize spaces and line breaks
 */
function normalizeSpaces(text: string): { text: string; linesMerged: number } {
  let linesMerged = 0;

  // 1. Convert CRLF to LF
  text = text.replace(/\r\n/g, "\n");

  // 2. Remove trailing spaces from lines
  text = text.replace(/ +$/gm, "");

  // 3. Compress multiple spaces into one (except leading spaces for indentation)
  text = text.replace(/([^\n]) {2,}/g, "$1 ");

  // 4. Normalize paragraph breaks (3+ newlines → 2 newlines)
  text = text.replace(/\n{3,}/g, "\n\n");

  // 5. Count lines that will be merged (single newlines between non-empty lines)
  const beforeLines = text.split("\n").length;
  text = text.replace(/([^\n])\n([^\n])/g, (match, before, after) => {
    // Don't merge if it's a list item or heading
    if (/^[-•*]\s/.test(after) || /^[A-Z\s]{5,}$/.test(after) || /^\d+\./.test(after)) {
      return match;
    }
    linesMerged++;
    return `${before} ${after}`;
  });
  const afterLines = text.split("\n").length;
  linesMerged = beforeLines - afterLines;

  return { text, linesMerged };
}

/**
 * Normalize ligatures and special characters
 */
function normalizeLigatures(text: string): string {
  // Ligatures
  text = text.replace(/ﬁ/g, "fi");
  text = text.replace(/ﬂ/g, "fl");
  text = text.replace(/ﬀ/g, "ff");
  text = text.replace(/ﬃ/g, "ffi");
  text = text.replace(/ﬄ/g, "ffl");

  // Typographic quotes
  text = text.replace(/[""]/g, '"');
  text = text.replace(/['']/g, "'");

  // Em and en dashes (preserve in lists, convert elsewhere)
  text = text.replace(/—/g, " - ");
  text = text.replace(/–/g, "-");

  // Normalize apostrophes
  text = text.replace(/'/g, "'");

  // Ellipsis
  text = text.replace(/…/g, "...");

  return text;
}

/**
 * Join hyphenated words across line breaks
 */
function joinHyphenatedWords(text: string): { text: string; hyphenJoins: number } {
  let hyphenJoins = 0;

  // Pattern: word-\nword (hyphen at end of line followed by newline and word)
  text = text.replace(/([a-zA-Z])-\n([a-z])/g, (match, before, after) => {
    hyphenJoins++;
    return `${before}${after}`;
  });

  return { text, hyphenJoins };
}

/**
 * Normalize bullet points and lists
 */
function normalizeLists(text: string): string {
  // Normalize exotic bullets to standard dash
  text = text.replace(/^[•◦▪▫■□●○]\s/gm, "- ");

  // Normalize asterisk bullets
  text = text.replace(/^\*\s/gm, "- ");

  return text;
}

/**
 * Remove page separators added during parsing
 */
function removePageSeparators(text: string): string {
  // Remove --- PAGE N --- separators
  return text.replace(/\n*---\s*PAGE\s+\d+\s*---\n*/gi, "\n\n");
}

/**
 * Detect and remove repeated headers/footers
 */
function removeHeadersFooters(text: string, pages: number): { text: string; ratio: number } {
  if (pages < 2) return { text, ratio: 0 };

  const lines = text.split("\n");
  const lineCounts = new Map<string, number>();

  // Count line occurrences (ignore empty lines and very short lines)
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 100) {
      lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
    }
  }

  // Find repeated lines (appearing on >50% of pages)
  const threshold = Math.ceil(pages * 0.5);
  const repeatedLines = Array.from(lineCounts.entries())
    .filter(([, count]) => count >= threshold)
    .map(([line]) => line);

  if (repeatedLines.length === 0) {
    return { text, ratio: 0 };
  }

  // Remove repeated lines
  const originalLength = text.length;
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    // Keep line if it's not a repeated header/footer
    return !repeatedLines.includes(trimmed);
  });

  const cleanText = filteredLines.join("\n");
  const ratio = (originalLength - cleanText.length) / originalLength;

  return { text: cleanText, ratio };
}

/**
 * Remove isolated page numbers
 */
function removePageNumbers(text: string): string {
  // Remove lines that are just numbers (likely page numbers)
  return text.replace(/^\s*\d+\s*$/gm, "");
}

/**
 * Remove PDF metadata lines
 */
function removeMetadataLines(text: string): string {
  // Remove lines containing PDF producer/generator signatures
  const patterns = [
    /generated\s+by/i,
    /pdf\s+producer/i,
    /created\s+with/i,
    /adobe\s+acrobat/i,
    /microsoft\s+word/i,
  ];

  const lines = text.split("\n");
  const filtered = lines.filter((line) => {
    const lower = line.toLowerCase();
    return !patterns.some((pattern) => pattern.test(lower));
  });

  return filtered.join("\n");
}

/**
 * Remove non-printable characters
 */
function removeNonPrintable(text: string): string {
  // Remove control characters except newline and tab
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
}

/**
 * Normalize non-breaking spaces
 */
function normalizeNonBreakingSpaces(text: string): string {
  return text.replace(/\u00A0/g, " "); // Non-breaking space → regular space
}

/**
 * Detect document title (first significant lines)
 */
function detectTitle(text: string): string | undefined {
  const lines = text.split("\n");

  // Find first significant line (not empty, not too short)
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 5 && trimmed.length <= 100) {
      // Likely a title if it's all caps or title case
      if (/^[A-Z\s]{5,}$/.test(trimmed) || /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(trimmed)) {
        return trimmed;
      }
    }
  }

  return undefined;
}

/**
 * Detect headings in text
 */
function detectHeadings(text: string): Heading[] {
  const headings: Heading[] = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (line.length === 0) continue;

    // Level 1: ALL CAPS headings (5+ chars)
    if (/^[A-Z\s]{5,}$/.test(line)) {
      headings.push({ level: 1, text: line, index: i });
      continue;
    }

    // Level 1: Numbered sections (ARTICLE 1, Section 1, etc.)
    if (/^(ARTICLE|SECTION|CHAPITRE|PARTIE)\s+\d+/i.test(line)) {
      headings.push({ level: 1, text: line, index: i });
      continue;
    }

    // Level 2: Numbered headings (1., 1.1, etc.)
    if (/^\d+(\.\d+)*\.\s+[A-Z]/.test(line)) {
      const level = (line.match(/\./g) || []).length <= 2 ? 2 : 3;
      headings.push({ level: level as 2 | 3, text: line, index: i });
      continue;
    }

    // Level 2: Title Case headings (Title Case Words)
    if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,}$/.test(line) && line.length >= 10 && line.length <= 80) {
      headings.push({ level: 2, text: line, index: i });
      continue;
    }

    // Level 3: Clause/Article markers
    if (/^(Clause|Article|Annexe)\s+/i.test(line)) {
      headings.push({ level: 3, text: line, index: i });
      continue;
    }
  }

  return headings;
}

/**
 * Estimate token count (heuristic: chars/4)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Normalize contract text
 *
 * @param input - Raw text from PDF parsing
 * @returns Normalized text with stats and sections
 *
 * @throws {TextTooShortError} If text is too short after cleanup
 *
 * @example
 * ```ts
 * const result = normalizeContractText({
 *   textRaw: pdfData.textRaw,
 *   pages: pdfData.pages,
 *   meta: pdfData.meta,
 * });
 * console.log(`Clean text: ${result.textClean.length} chars, ~${result.textTokensApprox} tokens`);
 * ```
 */
export function normalizeContractText(input: NormalizeInput): NormalizeResult {
  let { textRaw } = input;
  const { pages } = input;

  const originalLength = textRaw.length;

  // Track stats
  let hyphenJoins = 0;
  let linesMerged = 0;
  let headerFooterRatio = 0;

  // 1. Remove page separators
  textRaw = removePageSeparators(textRaw);

  // 2. Normalize ligatures and special characters
  textRaw = normalizeLigatures(textRaw);

  // 3. Join hyphenated words
  const hyphenResult = joinHyphenatedWords(textRaw);
  textRaw = hyphenResult.text;
  hyphenJoins = hyphenResult.hyphenJoins;

  // 4. Normalize lists
  textRaw = normalizeLists(textRaw);

  // 5. Remove headers/footers
  const headerFooterResult = removeHeadersFooters(textRaw, pages);
  textRaw = headerFooterResult.text;
  headerFooterRatio = headerFooterResult.ratio;

  // 6. Remove page numbers
  textRaw = removePageNumbers(textRaw);

  // 7. Remove metadata lines
  textRaw = removeMetadataLines(textRaw);

  // 8. Normalize spaces and line breaks
  const spaceResult = normalizeSpaces(textRaw);
  textRaw = spaceResult.text;
  linesMerged = spaceResult.linesMerged;

  // 9. Remove non-printable characters
  textRaw = removeNonPrintable(textRaw);

  // 10. Normalize non-breaking spaces
  textRaw = normalizeNonBreakingSpaces(textRaw);

  // 11. Final trim
  textRaw = textRaw.trim();

  // 12. Check minimum length
  if (textRaw.length < MIN_TEXT_LENGTH_AFTER_CLEANUP) {
    throw new TextTooShortError(textRaw.length);
  }

  // 13. Truncate if too long
  let truncated = false;
  if (textRaw.length > MAX_TEXT_LENGTH) {
    textRaw = textRaw.substring(0, MAX_TEXT_LENGTH);
    truncated = true;
  }

  // 14. Detect sections
  const title = detectTitle(textRaw);
  const headings = detectHeadings(textRaw);

  // 15. Estimate tokens
  const textTokensApprox = estimateTokens(textRaw);

  return {
    textClean: textRaw,
    textTokensApprox,
    stats: {
      pages,
      textLengthRaw: originalLength,
      textLengthClean: textRaw.length,
      removedHeaderFooterRatio: headerFooterRatio,
      hyphenJoins,
      linesMerged,
      truncated,
    },
    sections: {
      title,
      headings,
    },
  };
}
