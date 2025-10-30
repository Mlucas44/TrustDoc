"use client";

/**
 * UploadDropzone Component
 *
 * Drag & drop file upload component for PDF contracts.
 * - Validates file type (PDF only) and size (≤10 MB)
 * - Shows upload progress
 * - Handles errors with user-friendly messages
 * - Calls POST /api/upload on file drop/selection
 */

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface UploadDropzoneProps {
  /**
   * Callback when file upload succeeds
   */
  onUploadSuccess?: (result: UploadResult) => void;
  /**
   * Callback when upload fails
   */
  onUploadError?: (error: UploadError) => void;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Disabled state
   */
  disabled?: boolean;
}

export interface UploadResult {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  path: string;
}

export interface UploadError {
  error: string;
  code: string;
  details?: string;
}

type UploadState = "idle" | "uploading" | "success" | "error";

/**
 * UploadDropzone - Drag & drop PDF upload component
 *
 * @example
 * ```tsx
 * <UploadDropzone
 *   onUploadSuccess={(result) => {
 *     console.log("Uploaded:", result.fileId);
 *     // Proceed to analysis with fileId
 *   }}
 *   onUploadError={(error) => {
 *     console.error("Upload failed:", error.error);
 *   }}
 * />
 * ```
 */
export function UploadDropzone({
  onUploadSuccess,
  onUploadError,
  className,
  disabled = false,
}: UploadDropzoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(null);

  /**
   * Handle file upload
   */
  const uploadFile = useCallback(
    async (file: File) => {
      // Reset state
      setError(null);
      setState("uploading");
      setUploadProgress(0);

      try {
        // Client-side validation (before upload)
        if (file.type !== "application/pdf") {
          throw new Error("Seuls les fichiers PDF sont acceptés");
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(
            `Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(2)} Mo). Maximum: ${MAX_FILE_SIZE_MB} Mo`
          );
        }

        // Create FormData
        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress (since fetch doesn't support upload progress easily)
        setUploadProgress(10);

        // Upload to API
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        setUploadProgress(90);

        // Handle non-OK responses
        if (!response.ok) {
          const errorData = (await response.json()) as UploadError;

          // Map error codes to user-friendly messages
          let errorMessage = errorData.error;

          if (response.status === 402) {
            // Insufficient credits or quota exceeded
            errorMessage =
              errorData.code === "INSUFFICIENT_CREDITS"
                ? "Vous n'avez pas assez de crédits. Veuillez acheter des crédits pour continuer."
                : "Vous avez atteint votre limite de 3 analyses gratuites. Veuillez vous connecter pour continuer.";
          } else if (response.status === 413) {
            errorMessage = `Le fichier est trop volumineux. Maximum: ${MAX_FILE_SIZE_MB} Mo`;
          } else if (response.status === 415) {
            errorMessage = "Seuls les fichiers PDF sont acceptés";
          }

          throw new Error(errorMessage);
        }

        // Parse success response
        const result = (await response.json()) as UploadResult;

        setUploadProgress(100);
        setState("success");
        setUploadedFile(result);

        // Callback
        onUploadSuccess?.(result);
      } catch (err) {
        console.error("[UploadDropzone] Upload error:", err);

        const errorMessage =
          err instanceof Error ? err.message : "Une erreur est survenue lors de l'upload";

        setError(errorMessage);
        setState("error");

        // Callback
        onUploadError?.({
          error: errorMessage,
          code: "UPLOAD_FAILED",
        });
      }
    },
    [onUploadSuccess, onUploadError]
  );

  /**
   * Handle file drop
   */
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      uploadFile(file);
    },
    [uploadFile]
  );

  /**
   * React Dropzone
   */
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE_BYTES,
    disabled: disabled || state === "uploading",
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection) {
        const error = rejection.errors[0];
        if (error?.code === "file-too-large") {
          setError(`Le fichier est trop volumineux. Maximum: ${MAX_FILE_SIZE_MB} Mo`);
        } else if (error?.code === "file-invalid-type") {
          setError("Seuls les fichiers PDF sont acceptés");
        } else {
          setError("Fichier invalide");
        }
        setState("error");
      }
    },
  });

  /**
   * Reset state
   */
  const reset = () => {
    setState("idle");
    setError(null);
    setUploadProgress(0);
    setUploadedFile(null);
  };

  return (
    <div className={className}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative rounded-lg border-2 border-dashed p-8 text-center transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
          ${state === "uploading" ? "pointer-events-none opacity-50" : "cursor-pointer"}
          ${disabled ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input {...getInputProps()} />

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          {state === "uploading" ? (
            <svg
              className="h-12 w-12 animate-spin text-primary"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : state === "success" ? (
            <svg
              className="h-12 w-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : state === "error" ? (
            <svg
              className="h-12 w-12 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="space-y-2">
          {state === "uploading" ? (
            <>
              <p className="text-sm font-medium">Upload en cours...</p>
              <Progress value={uploadProgress} className="mx-auto w-full max-w-xs" />
            </>
          ) : state === "success" ? (
            <>
              <p className="text-sm font-medium text-green-600">Fichier uploadé avec succès!</p>
              {uploadedFile && (
                <p className="text-xs text-muted-foreground">{uploadedFile.filename}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium">
                {isDragActive ? "Déposez le fichier ici" : "Glissez-déposez un PDF ici"}
              </p>
              <p className="text-xs text-muted-foreground">
                ou cliquez pour sélectionner un fichier
              </p>
              <p className="text-xs text-muted-foreground">
                PDF uniquement, max {MAX_FILE_SIZE_MB} Mo
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {state === "error" && error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={reset}>
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Actions */}
      {state === "success" && (
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            Uploader un autre fichier
          </Button>
        </div>
      )}
    </div>
  );
}
