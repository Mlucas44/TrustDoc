/**
 * Mock LLM responses for deterministic testing
 *
 * Uses MSW (Mock Service Worker) to intercept HTTP requests to OpenAI API
 * and return predictable responses instead of making real API calls.
 *
 * Benefits:
 * - No API costs during tests
 * - Deterministic results (no flakiness)
 * - Fast execution (no network latency)
 * - Test error scenarios easily
 */

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

/**
 * Réponse LLM mock pour contrat freelance
 */
const MOCK_FREELANCE_RESPONSE = {
  risks: [
    {
      category: "PAYMENT",
      severity: "HIGH",
      title: "Délai de paiement excessif",
      excerpt: "Le paiement interviendra sous 90 jours...",
      recommendation: "Négocier un délai maximal de 30 jours",
    },
    {
      category: "LIABILITY",
      severity: "MEDIUM",
      title: "Clause de responsabilité illimitée",
      excerpt: "Le prestataire est responsable sans limitation...",
      recommendation: "Limiter la responsabilité au montant du contrat",
    },
    {
      category: "IP",
      severity: "LOW",
      title: "Cession automatique de propriété intellectuelle",
      excerpt:
        "Tous les droits de propriété intellectuelle sont automatiquement cédés au client...",
      recommendation: "Négocier une licence limitée plutôt qu'une cession complète",
    },
  ],
  summary:
    "Contrat freelance présentant des risques sur les délais de paiement (90 jours), la responsabilité illimitée, et la cession automatique de propriété intellectuelle.",
};

/**
 * Réponse LLM mock pour contrat CDI
 */
const MOCK_EMPLOYMENT_RESPONSE = {
  risks: [
    {
      category: "NON_COMPETE",
      severity: "HIGH",
      title: "Clause de non-concurrence disproportionnée",
      excerpt: "Interdiction de travailler dans le même secteur pendant 24 mois...",
      recommendation: "Limiter la durée à 12 mois et demander une contrepartie financière",
    },
    {
      category: "MOBILITY",
      severity: "MEDIUM",
      title: "Mobilité géographique sans limites",
      excerpt: "L'employé accepte toute mutation géographique en France ou à l'étranger...",
      recommendation: "Limiter la zone géographique et prévoir un préavis",
    },
  ],
  summary:
    "Contrat CDI avec clause de non-concurrence très restrictive (24 mois) et mobilité géographique illimitée.",
};

/**
 * Handlers MSW pour OpenAI API
 */
const handlers = [
  // Mock OpenAI chat completions
  http.post("https://api.openai.com/v1/chat/completions", async ({ request }) => {
    const body = (await request.json()) as { messages?: Array<{ content?: string }> };

    // Détermine le type de contrat basé sur le prompt
    const prompt = body.messages?.[0]?.content?.toLowerCase() || "";
    const response =
      prompt.includes("freelance") || prompt.includes("prestataire")
        ? MOCK_FREELANCE_RESPONSE
        : MOCK_EMPLOYMENT_RESPONSE;

    return HttpResponse.json({
      id: "chatcmpl-test",
      object: "chat.completion",
      created: Date.now(),
      model: "gpt-4o-mini",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify(response),
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
    });
  }),
];

/**
 * Serveur MSW pour tests
 */
export const llmMockServer = setupServer(...handlers);

/**
 * Active les mocks LLM
 * À appeler dans beforeAll() ou beforeEach()
 */
export function enableLLMMocks() {
  llmMockServer.listen({ onUnhandledRequest: "bypass" });
}

/**
 * Désactive les mocks LLM
 * À appeler dans afterAll()
 */
export function disableLLMMocks() {
  llmMockServer.close();
}

/**
 * Réinitialise les mocks LLM aux handlers par défaut
 * À appeler dans afterEach() si vous modifiez les handlers pendant un test
 */
export function resetLLMMocks() {
  llmMockServer.resetHandlers();
}

/**
 * Mock une réponse LLM custom
 * Utile pour tester des cas d'erreur ou des réponses spécifiques
 */
export function mockLLMResponse(response: unknown) {
  llmMockServer.use(
    http.post("https://api.openai.com/v1/chat/completions", () => {
      return HttpResponse.json({
        choices: [
          {
            message: {
              content: typeof response === "string" ? response : JSON.stringify(response),
            },
          },
        ],
      });
    })
  );
}

/**
 * Mock une erreur LLM
 * Utile pour tester la gestion des erreurs
 */
export function mockLLMError(statusCode: number, message: string) {
  llmMockServer.use(
    http.post("https://api.openai.com/v1/chat/completions", () => {
      return HttpResponse.json(
        {
          error: {
            message,
            type: "test_error",
            code: statusCode,
          },
        },
        { status: statusCode }
      );
    })
  );
}

/**
 * Mock un timeout LLM
 * Utile pour tester les timeouts
 */
export function mockLLMTimeout(delayMs: number = 31000) {
  llmMockServer.use(
    http.post("https://api.openai.com/v1/chat/completions", async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return HttpResponse.json({
        choices: [{ message: { content: "Too slow" } }],
      });
    })
  );
}

/**
 * Mock un JSON invalide du LLM
 * Utile pour tester la validation de schéma
 */
export function mockLLMInvalidJSON() {
  llmMockServer.use(
    http.post("https://api.openai.com/v1/chat/completions", () => {
      return HttpResponse.json({
        choices: [
          {
            message: {
              content: "This is not valid JSON at all!",
            },
          },
        ],
      });
    })
  );
}

/**
 * Mock un JSON valide mais sans les champs requis
 * Utile pour tester la validation de schéma
 */
export function mockLLMMissingFields() {
  llmMockServer.use(
    http.post("https://api.openai.com/v1/chat/completions", () => {
      return HttpResponse.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Valid summary but missing risks field",
                // Missing "risks" field
              }),
            },
          },
        ],
      });
    })
  );
}
