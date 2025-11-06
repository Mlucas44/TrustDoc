/**
 * Mock Supabase Storage for integration tests
 *
 * Uses local filesystem instead of real Supabase to avoid external dependencies.
 * Files are stored in .test-storage/ directory (git-ignored).
 */

import fs from "fs/promises";
import path from "path";

const MOCK_STORAGE_DIR = path.join(process.cwd(), ".test-storage");

/**
 * Initialise le répertoire de stockage mock
 */
export async function initTestStorage() {
  await fs.mkdir(MOCK_STORAGE_DIR, { recursive: true });
}

/**
 * Nettoie tous les fichiers de stockage mock
 */
export async function cleanupTestStorage() {
  try {
    await fs.rm(MOCK_STORAGE_DIR, { recursive: true, force: true });
  } catch {
    // Ignore si le répertoire n'existe pas
  }
}

/**
 * Upload un fichier vers le stockage mock
 */
export async function uploadToMockStorage(filePath: string, buffer: Buffer): Promise<string> {
  await initTestStorage();
  const fullPath = path.join(MOCK_STORAGE_DIR, filePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return filePath;
}

/**
 * Télécharge un fichier depuis le stockage mock
 */
export async function downloadFromMockStorage(filePath: string): Promise<Buffer> {
  const fullPath = path.join(MOCK_STORAGE_DIR, filePath);
  return fs.readFile(fullPath);
}

/**
 * Vérifie si un fichier existe dans le stockage mock
 */
export async function fileExistsInMockStorage(filePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(MOCK_STORAGE_DIR, filePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Supprime un fichier du stockage mock
 */
export async function deleteFromMockStorage(filePath: string): Promise<void> {
  try {
    const fullPath = path.join(MOCK_STORAGE_DIR, filePath);
    await fs.unlink(fullPath);
  } catch {
    // Ignore si le fichier n'existe pas
  }
}

/**
 * Liste tous les fichiers du stockage mock
 */
export async function listMockStorageFiles(): Promise<string[]> {
  try {
    const files: string[] = [];
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          const relativePath = path.relative(MOCK_STORAGE_DIR, fullPath);
          files.push(relativePath);
        }
      }
    };
    await walk(MOCK_STORAGE_DIR);
    return files;
  } catch {
    return [];
  }
}
