/**
 * Storage Service
 *
 * Handles file uploads to Supabase Storage with mock mode for local development.
 * Provides secure, temporary storage for PDF contracts.
 */

import "server-only";

import fs from "fs/promises";
import path from "path";

import { createId } from "@paralleldrive/cuid2";
import { createClient } from "@supabase/supabase-js";

// Configuration
const BUCKET_NAME = "contracts-temp";
const MAX_FILE_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || "10", 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = (process.env.UPLOAD_ALLOWED_MIME_TYPES || "application/pdf").split(",");
const MOCK_STORAGE = process.env.MOCK_STORAGE === "true";
const MOCK_STORAGE_DIR = path.join(process.cwd(), "temp", "uploads");

/**
 * Custom errors
 */
export class FileTooLargeError extends Error {
  constructor(size: number, maxSize: number) {
    super(`File size ${(size / 1024 / 1024).toFixed(2)} MB exceeds maximum ${maxSize} MB`);
    this.name = "FileTooLargeError";
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor(mimeType: string, allowedTypes: string[]) {
    super(`File type ${mimeType} not supported. Allowed: ${allowedTypes.join(", ")}`);
    this.name = "UnsupportedFileTypeError";
  }
}

export class StorageUploadError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "StorageUploadError";
  }
}

/**
 * Upload result
 */
export interface UploadResult {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  path: string;
}

/**
 * Initialize Supabase client with service role key (server-side only)
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase configuration (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): void {
  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileTooLargeError(file.size, MAX_FILE_SIZE_MB);
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new UnsupportedFileTypeError(file.type, ALLOWED_MIME_TYPES);
  }
}

/**
 * Generate unique filename with path
 */
export function generateFilePath(
  userId: string,
  isGuest: boolean
): { fileId: string; filePath: string } {
  const fileId = createId();
  const timestamp = Date.now();
  const prefix = isGuest ? `guest-${userId}` : `user-${userId}`;
  const filename = `${fileId}-${timestamp}.pdf`;
  const filePath = `${prefix}/${filename}`;

  return { fileId, filePath };
}

/**
 * Upload file to Supabase Storage (MOCK MODE)
 */
async function uploadFileMock(
  buffer: Buffer,
  filePath: string,
  _mimeType: string
): Promise<{ path: string }> {
  // Ensure mock directory exists
  await fs.mkdir(MOCK_STORAGE_DIR, { recursive: true });

  const fullPath = path.join(MOCK_STORAGE_DIR, filePath);
  const dir = path.dirname(fullPath);

  // Ensure subdirectory exists
  await fs.mkdir(dir, { recursive: true });

  // Write file
  await fs.writeFile(fullPath, buffer);

  // eslint-disable-next-line no-console
  console.log(`[MOCK_STORAGE] File saved to ${fullPath}`);

  return { path: filePath };
}

/**
 * Upload file to Supabase Storage (PRODUCTION MODE)
 */
async function uploadFileProduction(
  buffer: Buffer,
  filePath: string,
  mimeType: string
): Promise<{ path: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, buffer, {
    contentType: mimeType,
    upsert: false, // Prevent overwriting (should never happen with CUID)
  });

  if (error) {
    console.error("[uploadFileProduction] Supabase upload error:", error);
    throw new StorageUploadError(`Failed to upload file to storage: ${error.message}`, error);
  }

  if (!data?.path) {
    throw new StorageUploadError("Upload succeeded but no path returned");
  }

  return { path: data.path };
}

/**
 * Upload file to storage (auto-selects mock or production mode)
 *
 * @param file - File object from FormData
 * @param userId - User ID or guest ID
 * @param isGuest - Whether user is guest (for path naming)
 * @returns Upload result with file metadata
 *
 * @example
 * ```ts
 * const file = formData.get("file") as File;
 * const result = await uploadFile(file, userId, false);
 * // { fileId: "cm4x5y6z7", filename: "cm4x5y6z7-1699123456789.pdf", ... }
 * ```
 */
export async function uploadFile(
  file: File,
  userId: string,
  isGuest: boolean
): Promise<UploadResult> {
  // 1. Validate file
  validateFile(file);

  // 2. Generate unique file path
  const { fileId, filePath } = generateFilePath(userId, isGuest);

  // 3. Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 4. Upload to storage (mock or production)
  let uploadResult: { path: string };

  if (MOCK_STORAGE) {
    // eslint-disable-next-line no-console
    console.log("[uploadFile] Using MOCK_STORAGE mode");
    uploadResult = await uploadFileMock(buffer, filePath, file.type);
  } else {
    uploadResult = await uploadFileProduction(buffer, filePath, file.type);
  }

  // 5. Return metadata
  return {
    fileId,
    filename: path.basename(filePath),
    size: file.size,
    mimeType: file.type,
    path: uploadResult.path,
  };
}

/**
 * Download file from storage as Buffer
 *
 * @param filePath - Full path to file (e.g., "user-abc123/cm4x5y6z7-1699123456789.pdf")
 * @returns File buffer
 *
 * @example
 * ```ts
 * const buffer = await downloadFile(result.path);
 * ```
 */
export async function downloadFile(filePath: string): Promise<Buffer> {
  if (MOCK_STORAGE) {
    // Mock mode: read from local filesystem
    const fullPath = path.join(MOCK_STORAGE_DIR, filePath);
    try {
      const buffer = await fs.readFile(fullPath);
      return buffer;
    } catch (error) {
      console.error(`[MOCK_STORAGE] Failed to read file ${fullPath}:`, error);
      throw new StorageUploadError(`File not found: ${filePath}`, error);
    }
  }

  // Production mode: download from Supabase
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(filePath);

  if (error) {
    console.error("[downloadFile] Supabase download error:", error);
    throw new StorageUploadError(`Failed to download file: ${error.message}`, error);
  }

  if (!data) {
    throw new StorageUploadError(`File not found: ${filePath}`);
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete file from storage
 *
 * @param filePath - Full path to file (e.g., "user-abc123/cm4x5y6z7-1699123456789.pdf")
 *
 * @example
 * ```ts
 * await deleteFile(result.path);
 * ```
 */
export async function deleteFile(filePath: string): Promise<void> {
  if (MOCK_STORAGE) {
    // Mock mode: delete from local filesystem
    const fullPath = path.join(MOCK_STORAGE_DIR, filePath);
    try {
      await fs.unlink(fullPath);
      // eslint-disable-next-line no-console
      console.log(`[MOCK_STORAGE] File deleted: ${fullPath}`);
    } catch (error) {
      console.error(`[MOCK_STORAGE] Failed to delete file ${fullPath}:`, error);
      // Don't throw - file might already be deleted
    }
    return;
  }

  // Production mode: delete from Supabase
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    console.error("[deleteFile] Supabase delete error:", error);
    throw new StorageUploadError(`Failed to delete file: ${error.message}`, error);
  }

  // eslint-disable-next-line no-console
  console.log(`[deleteFile] File deleted from Supabase: ${filePath}`);
}

/**
 * Delete all files for a user (cleanup utility)
 *
 * @param userId - User ID or guest ID
 * @param isGuest - Whether user is guest
 */
export async function deleteUserFiles(userId: string, isGuest: boolean): Promise<void> {
  const prefix = isGuest ? `guest-${userId}` : `user-${userId}`;

  if (MOCK_STORAGE) {
    // Mock mode: delete directory
    const dirPath = path.join(MOCK_STORAGE_DIR, prefix);
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      // eslint-disable-next-line no-console
      console.log(`[MOCK_STORAGE] Directory deleted: ${dirPath}`);
    } catch (error) {
      console.error(`[MOCK_STORAGE] Failed to delete directory ${dirPath}:`, error);
    }
    return;
  }

  // Production mode: list and delete all files with prefix
  const supabase = getSupabaseClient();

  const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list(prefix);

  if (listError) {
    console.error("[deleteUserFiles] Failed to list files:", listError);
    throw new StorageUploadError(`Failed to list user files: ${listError.message}`, listError);
  }

  if (!files || files.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`[deleteUserFiles] No files found for ${prefix}`);
    return;
  }

  const filePaths = files.map((file) => `${prefix}/${file.name}`);

  const { error: deleteError } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

  if (deleteError) {
    console.error("[deleteUserFiles] Failed to delete files:", deleteError);
    throw new StorageUploadError(
      `Failed to delete user files: ${deleteError.message}`,
      deleteError
    );
  }

  // eslint-disable-next-line no-console
  console.log(`[deleteUserFiles] Deleted ${files.length} files for ${prefix}`);
}
