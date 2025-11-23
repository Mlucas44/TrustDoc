/**
 * Lightweight text preparation for PDF extracts
 *
 * Cleans text before LLM processing without heavy normalization.
 * Designed to be fast and minimal - removes artifacts, joins hyphenated words,
 * normalizes spaces and ligatures.
 *
 * @module src/pdf/prepare/lite
 */

export interface PrepareStats {
  /** Original text length before cleaning */
  originalLength: number;
  /** Cleaned text length after processing */
  cleanedLength: number;
  /** Number of page markers removed (--- PAGE N ---) */
  pageMarkersRemoved: number;
  /** Number of hyphenated line breaks joined */
  hyphensJoined: number;
  /** Number of multiple-space sequences normalized */
  spacesNormalized: number;
}

export interface PrepareLiteResult {
  /** Cleaned text ready for LLM */
  textClean: string;
  /** Statistics about the cleaning process */
  stats: PrepareStats;
}

/**
 * Lightweight text preparation
 *
 * Performs minimal cleaning operations:
 * 1. Remove page markers (--- PAGE N ---)
 * 2. Join hyphenated words at line breaks (word-\nbreak → wordbreak)
 * 3. Normalize multiple spaces to single space
 * 4. Replace common ligatures with standard characters
 *
 * @param textRaw - Raw text extracted from PDF
 * @returns Cleaned text and statistics
 *
 * @example
 * ```ts
 * const raw = "some-\nthing --- PAGE 1 --- text";
 * const result = prepareLite(raw);
 * console.log(result.textClean); // "something text"
 * console.log(result.stats.hyphensJoined); // 1
 * ```
 */
export function prepareLite(textRaw: string): PrepareLiteResult {
  let text = textRaw;
  const stats: PrepareStats = {
    originalLength: textRaw.length,
    cleanedLength: 0,
    pageMarkersRemoved: 0,
    hyphensJoined: 0,
    spacesNormalized: 0,
  };

  // 1. Remove page markers (--- PAGE N ---)
  // Matches patterns like:
  // - "--- PAGE 1 ---"
  // - "---PAGE 42---"
  // - "\n--- PAGE 123 ---\n"
  const pageMarkerRegex = /\n?---\s*PAGE\s+\d+\s*---\n?/gi;
  const pageMatches = text.match(pageMarkerRegex);
  stats.pageMarkersRemoved = pageMatches ? pageMatches.length : 0;
  text = text.replace(pageMarkerRegex, "\n");

  // 2. Join hyphenated words at line breaks
  // Matches patterns like:
  // - "word-\nbreak" → "wordbreak"
  // - "hyphen- \n ated" → "hyphenated"
  const hyphenRegex = /-\s*\n\s*/g;
  const hyphenMatches = text.match(hyphenRegex);
  stats.hyphensJoined = hyphenMatches ? hyphenMatches.length : 0;
  text = text.replace(hyphenRegex, "");

  // 3. Normalize spaces and common ligatures
  // a) Multiple spaces to single space
  const multiSpaceRegex = / {2,}/g;
  const spaceMatches = text.match(multiSpaceRegex);
  stats.spacesNormalized = spaceMatches ? spaceMatches.length : 0;
  text = text.replace(multiSpaceRegex, " ");

  // b) Common ligatures to standard characters
  // These are typographic ligatures that LLMs may struggle with
  text = text.replace(/ﬁ/g, "fi"); // U+FB01
  text = text.replace(/ﬂ/g, "fl"); // U+FB02
  text = text.replace(/ﬀ/g, "ff"); // U+FB00
  text = text.replace(/ﬃ/g, "ffi"); // U+FB03
  text = text.replace(/ﬄ/g, "ffl"); // U+FB04

  stats.cleanedLength = text.length;

  return { textClean: text, stats };
}
