/**
 * Development Mock for Storage Service
 *
 * In development mode, this allows testing PDF parsing APIs
 * without needing actual Supabase storage uploads.
 *
 * Usage:
 * 1. Set DEV_USE_FIXTURE_STORAGE=true in .env.local
 * 2. Call API with filePath like "user-test123/simple.pdf"
 * 3. The mock will read from fixtures/pdf/simple.pdf instead
 *
 * This is ONLY active when:
 * - NODE_ENV=development
 * - DEV_USE_FIXTURE_STORAGE=true
 */

import fs from "fs/promises";
import path from "path";

/**
 * Check if dev mock is enabled
 */
export function isDevMockEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.DEV_USE_FIXTURE_STORAGE === "true";
}

/**
 * Download file from fixtures in development mode
 *
 * Extracts filename from storage path and reads from fixtures/pdf/
 *
 * @param filePath - Storage path (e.g., "user-abc/simple.pdf")
 * @returns Buffer from fixtures
 */
export async function devDownloadFromFixtures(filePath: string): Promise<Buffer> {
  // Extract filename (e.g., "user-abc/simple.pdf" -> "simple.pdf")
  const filename = path.basename(filePath);
  const fixturePath = path.join(process.cwd(), "fixtures", "pdf", filename);

  console.log(`[DEV MOCK] Reading from fixtures: ${fixturePath}`);

  try {
    const buffer = await fs.readFile(fixturePath);
    console.log(`[DEV MOCK] Loaded ${buffer.length} bytes from ${filename}`);
    return buffer;
  } catch (error) {
    console.error(`[DEV MOCK] File not found: ${fixturePath}`);
    // Throw same error type as real storage service
    const StorageUploadError = class extends Error {
      constructor(message: string) {
        super(message);
        this.name = "StorageUploadError";
      }
    };
    throw new StorageUploadError(`File not found in fixtures: ${filename}`);
  }
}

/**
 * Mock delete (no-op in dev mode)
 */
export async function devDeleteFile(filePath: string): Promise<void> {
  console.log(`[DEV MOCK] Skipping deletion (fixtures are read-only): ${filePath}`);
}
