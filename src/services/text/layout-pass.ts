/**
 * Layout Pass - PDF Structure Analysis
 *
 * Analyzes PDF layout to detect form-like structures (especially Cerfa documents).
 * Extracts positional information (x, y, width, height) from text items to identify:
 * - Form fields and labels
 * - Column structures
 * - Checkboxes and form indicators
 * - Tabular regions
 */

import "server-only";

import * as pdfjsLib from "pdfjs-dist";

/**
 * Text block with positional information
 */
export interface TextBlock {
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Table-like region detected in the document
 */
export interface TableLikeRegion {
  page: number;
  text: string;
}

/**
 * Form indicators detected in the document
 */
export interface FormIndicators {
  /**
   * Count of checkbox-like patterns (☐, ☑, □, etc.)
   */
  checkboxes: number;

  /**
   * Count of colon-terminated labels (e.g., "Nom :", "Adresse :")
   */
  colonLabels: number;

  /**
   * Count of field-like labels (e.g., "Code postal", "Téléphone")
   */
  fieldLabels: number;
}

/**
 * Layout analysis result
 */
export interface LayoutInfo {
  /**
   * All text blocks with positions
   */
  blocks: TextBlock[];

  /**
   * Detected headings (larger text, bold-like positioning)
   */
  headings: string[];

  /**
   * Detected table-like regions
   */
  tableLikeRegions: TableLikeRegion[];

  /**
   * Form indicators (checkboxes, labels, fields)
   */
  formIndicators: FormIndicators;
}

/**
 * Common field labels found in Cerfa forms
 */
const CERFA_FIELD_LABELS = [
  "nom",
  "prénom",
  "prenom",
  "adresse",
  "code postal",
  "ville",
  "commune",
  "département",
  "departement",
  "téléphone",
  "telephone",
  "email",
  "date de naissance",
  "lieu de naissance",
  "nationalité",
  "nationalite",
  "profession",
  "signature",
  "cachet",
  "date",
  "numéro",
  "numero",
  "siret",
  "siren",
];

/**
 * Checkbox patterns (Unicode characters commonly used)
 */
const CHECKBOX_PATTERNS = [
  "☐", // Empty checkbox
  "☑", // Checked checkbox
  "☒", // X-marked checkbox
  "□", // Empty square
  "■", // Filled square
  "▢", // Light square
  "▣", // Square with fill
  "⬜", // White square
  "⬛", // Black square
  "❏", // Lower right drop-shadowed white square
  "❐", // Upper right drop-shadowed white square
  "❑", // Lower right shadowed white square
  "❒", // Upper right shadowed white square
];

/**
 * Analyze PDF layout to extract positional structure
 *
 * @param buffer - PDF file buffer
 * @returns Layout information with blocks, headings, tables, and form indicators
 *
 * @example
 * ```ts
 * const buffer = await downloadFile("cerfa.pdf");
 * const layoutInfo = await analyzeLayoutFromBuffer(buffer);
 * console.log(`Found ${layoutInfo.formIndicators.colonLabels} colon labels`);
 * console.log(`Cerfa score: ${computeCerfaLikelihood(layoutInfo)}`);
 * ```
 */
export async function analyzeLayoutFromBuffer(buffer: Buffer): Promise<LayoutInfo> {
  const startTime = performance.now();

  // Initialize pdfjs-dist
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    standardFontDataUrl: undefined,
  });

  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;

  console.info(`[layout-pass] Analyzing ${numPages} pages for layout structure`);

  const blocks: TextBlock[] = [];
  const headings: string[] = [];
  const tableLikeRegions: TableLikeRegion[] = [];
  const formIndicators: FormIndicators = {
    checkboxes: 0,
    colonLabels: 0,
    fieldLabels: 0,
  };

  // Process each page
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1.0 });

    // Extract text items with positions
    for (const item of textContent.items) {
      // Type guard: check if item has required properties
      if (!("str" in item) || !("transform" in item) || !("width" in item) || !("height" in item)) {
        continue;
      }

      const text = item.str.trim();
      if (text.length === 0) continue;

      // Extract position from transform matrix [a, b, c, d, e, f]
      // e = x position, f = y position
      const transform = item.transform;
      const x = transform[4];
      const y = viewport.height - transform[5]; // Flip Y coordinate (PDF uses bottom-left origin)
      const width = item.width;
      const height = item.height;

      blocks.push({
        page: pageNum,
        text,
        x,
        y,
        width,
        height,
      });

      // Detect headings (large text, typically > 14pt)
      if (height > 14 && text.length > 3) {
        headings.push(text);
      }

      // Detect checkboxes
      for (const checkbox of CHECKBOX_PATTERNS) {
        if (text.includes(checkbox)) {
          formIndicators.checkboxes++;
          break; // Count each block only once
        }
      }

      // Detect colon labels (e.g., "Nom :", "Adresse :")
      if (text.endsWith(":") && text.length >= 3 && text.length <= 50) {
        formIndicators.colonLabels++;
      }

      // Detect common field labels
      const lowerText = text.toLowerCase();
      for (const label of CERFA_FIELD_LABELS) {
        if (lowerText.includes(label)) {
          formIndicators.fieldLabels++;
          break; // Count each block only once
        }
      }
    }

    // Detect table-like regions (columns with aligned text)
    const tableRegion = detectTableLikeRegion(blocks, pageNum);
    if (tableRegion) {
      tableLikeRegions.push(tableRegion);
    }
  }

  const duration = performance.now() - startTime;
  console.info(
    `[layout-pass] Analysis complete: ${blocks.length} blocks, ${formIndicators.colonLabels} labels, ${formIndicators.checkboxes} checkboxes (${duration.toFixed(0)}ms)`
  );

  return {
    blocks,
    headings,
    tableLikeRegions,
    formIndicators,
  };
}

/**
 * Detect table-like regions based on column alignment
 */
function detectTableLikeRegion(blocks: TextBlock[], pageNum: number): TableLikeRegion | null {
  // Get blocks for this page
  const pageBlocks = blocks.filter((b) => b.page === pageNum);
  if (pageBlocks.length < 10) return null; // Not enough content

  // Group blocks by similar X positions (columns)
  const columnGroups = new Map<number, TextBlock[]>();
  const COLUMN_TOLERANCE = 5; // pixels

  for (const block of pageBlocks) {
    let foundColumn = false;

    for (const [columnX, group] of columnGroups.entries()) {
      if (Math.abs(block.x - columnX) < COLUMN_TOLERANCE) {
        group.push(block);
        foundColumn = true;
        break;
      }
    }

    if (!foundColumn) {
      columnGroups.set(block.x, [block]);
    }
  }

  // If we have 3+ columns with 5+ items each, it's likely a table
  const significantColumns = Array.from(columnGroups.values()).filter((group) => group.length >= 5);

  if (significantColumns.length >= 3) {
    const tableText = pageBlocks.map((b) => b.text).join(" ");
    return {
      page: pageNum,
      text: tableText.substring(0, 200), // First 200 chars as sample
    };
  }

  return null;
}

/**
 * Compute Cerfa likelihood score based on layout analysis
 *
 * @param layoutInfo - Layout analysis result
 * @returns Score between 0 and 1 (>= 0.45 suggests FORM_CERFA)
 *
 * @example
 * ```ts
 * const layoutInfo = await analyzeLayoutFromBuffer(buffer);
 * const score = computeCerfaLikelihood(layoutInfo);
 * if (score >= 0.45) {
 *   console.log("This is likely a Cerfa form");
 * }
 * ```
 */
export function computeCerfaLikelihood(layoutInfo: LayoutInfo): number {
  const { blocks, formIndicators } = layoutInfo;

  if (blocks.length === 0) return 0;

  // Scoring factors (weights tuned for Cerfa detection)
  const scores = {
    colonLabels: 0,
    fieldLabels: 0,
    checkboxes: 0,
    shortLines: 0,
    columnDensity: 0,
  };

  // 1. Colon labels density (strong indicator)
  const colonLabelDensity = formIndicators.colonLabels / blocks.length;
  if (colonLabelDensity > 0.15)
    scores.colonLabels = 0.35; // Very strong signal
  else if (colonLabelDensity > 0.08) scores.colonLabels = 0.25;
  else if (colonLabelDensity > 0.04) scores.colonLabels = 0.15;

  // 2. Field labels density (moderate indicator)
  const fieldLabelDensity = formIndicators.fieldLabels / blocks.length;
  if (fieldLabelDensity > 0.1) scores.fieldLabels = 0.25;
  else if (fieldLabelDensity > 0.05) scores.fieldLabels = 0.15;
  else if (fieldLabelDensity > 0.02) scores.fieldLabels = 0.08;

  // 3. Checkboxes presence (strong indicator)
  if (formIndicators.checkboxes >= 10) scores.checkboxes = 0.25;
  else if (formIndicators.checkboxes >= 5) scores.checkboxes = 0.15;
  else if (formIndicators.checkboxes >= 2) scores.checkboxes = 0.08;

  // 4. Short lines (form fields tend to be short)
  const shortLinesCount = blocks.filter((b) => b.text.length <= 30).length;
  const shortLineDensity = shortLinesCount / blocks.length;
  if (shortLineDensity > 0.6) scores.shortLines = 0.15;
  else if (shortLineDensity > 0.4) scores.shortLines = 0.1;
  else if (shortLineDensity > 0.25) scores.shortLines = 0.05;

  // 5. Column density (forms often have structured columns)
  const xPositions = blocks.map((b) => Math.round(b.x / 10) * 10); // Round to nearest 10px
  const uniqueXPositions = new Set(xPositions).size;
  const columnDensity = uniqueXPositions / blocks.length;
  if (columnDensity < 0.15 && uniqueXPositions >= 3)
    scores.columnDensity = 0.15; // Few columns, many items = structured
  else if (columnDensity < 0.25 && uniqueXPositions >= 2) scores.columnDensity = 0.08;

  // Sum all scores
  let totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

  // Anti-pattern: Many colon labels but very few field labels = likely contract with numbered articles, not Cerfa
  // Example: "Article 1:", "Article 2:" in contracts vs "Nom :", "Prénom :" in Cerfa
  // REDUCED penalty from 0.2 to 0.1 and tightened fieldLabel threshold to 0.015
  if (colonLabelDensity > 0.15 && fieldLabelDensity < 0.015) {
    const penalty = 0.1;
    totalScore = Math.max(0, totalScore - penalty);
    console.info(
      `[computeCerfaLikelihood] Anti-pattern detected: high colon labels (${(colonLabelDensity * 100).toFixed(1)}%) but very low field labels (${(fieldLabelDensity * 100).toFixed(1)}%) - applying penalty of ${penalty}`
    );
  }

  console.info(
    `[computeCerfaLikelihood] Score breakdown: colonLabels=${scores.colonLabels.toFixed(2)}, fieldLabels=${scores.fieldLabels.toFixed(2)}, checkboxes=${scores.checkboxes.toFixed(2)}, shortLines=${scores.shortLines.toFixed(2)}, columnDensity=${scores.columnDensity.toFixed(2)} => TOTAL=${totalScore.toFixed(2)}`
  );

  return Math.min(totalScore, 1.0); // Cap at 1.0
}
