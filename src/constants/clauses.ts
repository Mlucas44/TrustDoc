/**
 * Clause Constants
 *
 * Category labels, icons, and utilities for contract clauses.
 */

import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  Gavel,
  Lock,
  Scale,
  Shield,
  ShieldAlert,
  Target,
  UserX,
  Users,
} from "lucide-react";

import type { ClauseCategory } from "@/src/types/clause";

/**
 * Category labels for display
 */
export const CLAUSE_CATEGORY_LABELS: Record<ClauseCategory, string> = {
  parties: "Parties",
  object: "Objet",
  duration: "Durée",
  termination: "Résiliation",
  payment: "Paiement",
  liability: "Responsabilités",
  ip: "Propriété Intellectuelle",
  confidentiality: "Confidentialité",
  gdpr: "RGPD",
  jurisdiction: "Juridiction",
  non_compete: "Non-concurrence",
  assignment: "Cession/Sous-traitance",
  other: "Autre",
} as const;

/**
 * Category icons (lucide-react components)
 */
export const CLAUSE_CATEGORY_ICONS: Record<ClauseCategory, typeof FileText> = {
  parties: Users,
  object: Target,
  duration: Calendar,
  termination: Clock,
  payment: CreditCard,
  liability: Scale,
  ip: ShieldAlert,
  confidentiality: Lock,
  gdpr: Shield,
  jurisdiction: Gavel,
  non_compete: UserX,
  assignment: Building2,
  other: FileText,
} as const;

/**
 * Category colors (Tailwind classes)
 */
export const CLAUSE_CATEGORY_COLORS: Record<
  ClauseCategory,
  {
    badge: string;
    icon: string;
  }
> = {
  parties: {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    icon: "text-blue-600 dark:text-blue-400",
  },
  object: {
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    icon: "text-purple-600 dark:text-purple-400",
  },
  duration: {
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: "text-green-600 dark:text-green-400",
  },
  termination: {
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    icon: "text-orange-600 dark:text-orange-400",
  },
  payment: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  liability: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: "text-red-600 dark:text-red-400",
  },
  ip: {
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  confidentiality: {
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
    icon: "text-violet-600 dark:text-violet-400",
  },
  gdpr: {
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    icon: "text-cyan-600 dark:text-cyan-400",
  },
  jurisdiction: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    icon: "text-amber-600 dark:text-amber-400",
  },
  non_compete: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
    icon: "text-rose-600 dark:text-rose-400",
  },
  assignment: {
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
    icon: "text-teal-600 dark:text-teal-400",
  },
  other: {
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    icon: "text-gray-600 dark:text-gray-400",
  },
} as const;

/**
 * Normalize clause type string to category
 */
export function normalizeClauseCategory(type: string): ClauseCategory {
  const normalized = type.toLowerCase().trim();

  // Mapping rules (French and English)
  if (normalized.includes("partie") || normalized.includes("parties")) return "parties";
  if (
    normalized.includes("objet") ||
    normalized.includes("object") ||
    normalized.includes("purpose")
  )
    return "object";
  if (
    normalized.includes("durée") ||
    normalized.includes("duration") ||
    normalized.includes("terme")
  )
    return "duration";
  if (
    normalized.includes("résiliation") ||
    normalized.includes("termination") ||
    normalized.includes("fin")
  )
    return "termination";
  if (
    normalized.includes("paiement") ||
    normalized.includes("payment") ||
    normalized.includes("prix")
  )
    return "payment";
  if (
    normalized.includes("responsabilité") ||
    normalized.includes("liability") ||
    normalized.includes("garantie")
  )
    return "liability";
  if (
    normalized.includes("propriété intellectuelle") ||
    normalized.includes("intellectual property") ||
    normalized.includes("ip") ||
    normalized.includes("pi")
  )
    return "ip";
  if (
    normalized.includes("confidentialité") ||
    normalized.includes("confidentiality") ||
    normalized.includes("secret")
  )
    return "confidentiality";
  if (normalized.includes("rgpd") || normalized.includes("gdpr") || normalized.includes("données"))
    return "gdpr";
  if (
    normalized.includes("juridiction") ||
    normalized.includes("jurisdiction") ||
    normalized.includes("loi applicable")
  )
    return "jurisdiction";
  if (
    normalized.includes("non-concurrence") ||
    normalized.includes("non concurrence") ||
    normalized.includes("non-compete")
  )
    return "non_compete";
  if (
    normalized.includes("cession") ||
    normalized.includes("assignment") ||
    normalized.includes("sous-traitance")
  )
    return "assignment";

  return "other";
}

/**
 * Create clean preview from text (240-320 chars, clean cut)
 */
export function createClausePreview(text: string, maxLength = 280): string {
  if (text.length <= maxLength) return text;

  // Find clean cut point (sentence end or word boundary)
  const truncated = text.slice(0, maxLength);
  const lastPeriod = truncated.lastIndexOf(".");
  const lastSpace = truncated.lastIndexOf(" ");

  // Prefer sentence end, fallback to word boundary
  const cutPoint = lastPeriod > maxLength * 0.7 ? lastPeriod + 1 : lastSpace;

  return truncated.slice(0, cutPoint) + "...";
}
