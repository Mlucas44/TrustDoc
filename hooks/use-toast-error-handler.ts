/**
 * Error Handler Hook for Toast Notifications
 *
 * Provides user-friendly error messages for HTTP status codes and exceptions.
 * Maps technical errors to actionable messages for users.
 *
 * Usage:
 * ```tsx
 * const { handleError, handleFetchError } = useToastErrorHandler();
 *
 * try {
 *   const response = await fetch('/api/endpoint');
 *   if (!response.ok) {
 *     await handleFetchError(response);
 *     return;
 *   }
 * } catch (error) {
 *   handleError(error);
 * }
 * ```
 */

import { useToast } from "@/hooks/use-toast";

/**
 * Error response from API
 */
export interface ApiError {
  error?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Map HTTP status codes to user-friendly messages
 */
export function mapStatusToMessage(
  status: number,
  errorData?: ApiError
): { title: string; description: string } {
  // Use server error message if available and descriptive
  const serverMessage = errorData?.error || errorData?.message;

  switch (status) {
    case 400:
      return {
        title: "Requête invalide",
        description:
          serverMessage || "Les données envoyées sont invalides. Veuillez vérifier votre saisie.",
      };

    case 401:
      return {
        title: "Non autorisé",
        description: serverMessage || "Vous devez être connecté pour effectuer cette action.",
      };

    case 402:
      return {
        title: "Crédits insuffisants",
        description:
          serverMessage ||
          "Vous n'avez plus de crédits disponibles. Rechargez votre compte pour continuer.",
      };

    case 403:
      return {
        title: "Accès refusé",
        description: serverMessage || "Vous n'avez pas les permissions pour cette action.",
      };

    case 404:
      return {
        title: "Ressource introuvable",
        description: serverMessage || "La ressource demandée n'existe pas ou a été supprimée.",
      };

    case 413:
      return {
        title: "Fichier trop volumineux",
        description:
          serverMessage ||
          "Le fichier dépasse la taille maximale autorisée (10 Mo). Veuillez utiliser un fichier plus petit.",
      };

    case 415:
      return {
        title: "Type de fichier non supporté",
        description:
          serverMessage ||
          "Seuls les fichiers PDF sont acceptés. Veuillez convertir votre document.",
      };

    case 422:
      return {
        title: "Contenu non traitable",
        description:
          serverMessage ||
          "Le document ne peut pas être analysé. Vérifiez qu'il contient du texte extractible (pas scanné).",
      };

    case 429:
      return {
        title: "Trop de requêtes",
        description:
          serverMessage ||
          "Vous avez effectué trop de requêtes. Veuillez patienter quelques instants avant de réessayer.",
      };

    case 500:
      return {
        title: "Erreur serveur",
        description:
          serverMessage ||
          "Une erreur interne est survenue. Notre équipe a été notifiée. Veuillez réessayer plus tard.",
      };

    case 502:
      return {
        title: "Service temporairement indisponible",
        description:
          serverMessage ||
          "Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.",
      };

    case 503:
      return {
        title: "Service en maintenance",
        description:
          serverMessage ||
          "Le service est temporairement en maintenance. Veuillez réessayer dans quelques minutes.",
      };

    case 504:
      return {
        title: "Délai dépassé",
        description:
          serverMessage ||
          "Le traitement a pris trop de temps. Essayez avec un document plus court ou réessayez plus tard.",
      };

    default:
      if (status >= 500) {
        return {
          title: "Erreur serveur",
          description:
            serverMessage || "Une erreur est survenue côté serveur. Veuillez réessayer plus tard.",
        };
      } else if (status >= 400) {
        return {
          title: "Erreur",
          description: serverMessage || "Une erreur est survenue. Veuillez réessayer.",
        };
      }

      return {
        title: "Erreur inattendue",
        description: serverMessage || "Une erreur inattendue est survenue.",
      };
  }
}

/**
 * Map error exceptions to user-friendly messages
 */
export function mapErrorToMessage(error: unknown): { title: string; description: string } {
  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      title: "Erreur de connexion",
      description:
        "Impossible de se connecter au serveur. Vérifiez votre connexion Internet et réessayez.",
    };
  }

  // Timeout errors
  if (error instanceof Error && error.name === "AbortError") {
    return {
      title: "Délai dépassé",
      description: "La requête a pris trop de temps. Veuillez réessayer.",
    };
  }

  // Generic error with message
  if (error instanceof Error && error.message) {
    return {
      title: "Erreur",
      description: error.message,
    };
  }

  // Unknown error
  return {
    title: "Erreur inattendue",
    description: "Une erreur inattendue est survenue. Veuillez réessayer.",
  };
}

/**
 * Hook for handling errors with toast notifications
 */
export function useToastErrorHandler() {
  const { toast } = useToast();

  /**
   * Handle generic errors (exceptions)
   */
  const handleError = (error: unknown) => {
    const { title, description } = mapErrorToMessage(error);

    toast({
      variant: "destructive",
      title,
      description,
    });

    // Log to console for debugging (not sent to server)
    console.error("[useToastErrorHandler] Error:", error);
  };

  /**
   * Handle fetch response errors
   */
  const handleFetchError = async (response: Response) => {
    let errorData: ApiError | undefined;

    try {
      errorData = await response.json();
    } catch {
      // Failed to parse JSON, use default message
    }

    const { title, description } = mapStatusToMessage(response.status, errorData);

    toast({
      variant: "destructive",
      title,
      description,
    });

    // Log to console for debugging (not sent to server)
    console.error("[useToastErrorHandler] Fetch error:", {
      status: response.status,
      statusText: response.statusText,
      errorData,
    });
  };

  /**
   * Handle success messages
   */
  const handleSuccess = (title: string, description?: string) => {
    toast({
      title,
      description,
    });
  };

  return {
    handleError,
    handleFetchError,
    handleSuccess,
  };
}
