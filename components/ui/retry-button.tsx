/**
 * Retry Button Component
 *
 * Button with built-in retry logic, exponential backoff, and loading states.
 * Automatically handles retry attempts with user feedback.
 *
 * Usage:
 * ```tsx
 * <RetryButton
 *   onRetry={async () => {
 *     const response = await fetch('/api/endpoint');
 *     if (!response.ok) throw new Error('Failed');
 *     return response.json();
 *   }}
 *   onSuccess={(data) => console.log('Success!', data)}
 *   onError={(error) => toast.error(error.message)}
 * >
 *   Réessayer
 * </RetryButton>
 * ```
 */

import { Loader2, RefreshCw } from "lucide-react";
import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

export interface RetryButtonProps extends Omit<ButtonProps, "onClick" | "onError"> {
  /**
   * Async function to execute on retry
   */
  onRetry: () => Promise<unknown>;

  /**
   * Callback on successful retry (optional)
   */
  onSuccess?: (data: unknown) => void;

  /**
   * Callback on failed retry (optional)
   */
  onRetryError?: (error: Error) => void;

  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number;

  /**
   * Initial delay in ms for exponential backoff (default: 1000)
   */
  initialDelay?: number;

  /**
   * Show retry count in button text (default: false)
   */
  showRetryCount?: boolean;

  /**
   * Button text (default: "Réessayer")
   */
  children?: React.ReactNode;
}

export function RetryButton({
  onRetry,
  onSuccess,
  onRetryError,
  maxRetries = 3,
  initialDelay = 1000,
  showRetryCount = false,
  children = "Réessayer",
  disabled,
  ...props
}: RetryButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const handleRetry = async () => {
    setIsLoading(true);
    setRetryCount(0);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      try {
        const result = await onRetry();
        setIsLoading(false);
        setRetryCount(0);

        if (onSuccess) {
          onSuccess(result);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;
        setRetryCount(attempt);

        if (attempt < maxRetries) {
          // Exponential backoff: delay = initialDelay * 2^(attempt-1)
          const delay = initialDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    setIsLoading(false);
    setRetryCount(0);

    if (onRetryError && lastError) {
      onRetryError(lastError);
    }
  };

  const buttonText =
    showRetryCount && retryCount > 0 ? `Tentative ${retryCount}/${maxRetries}` : children;

  return (
    <Button
      onClick={handleRetry}
      disabled={isLoading || disabled}
      aria-busy={isLoading}
      aria-label={isLoading ? "Nouvelle tentative en cours..." : "Réessayer"}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {buttonText}
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          {buttonText}
        </>
      )}
    </Button>
  );
}
