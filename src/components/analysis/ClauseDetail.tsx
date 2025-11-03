"use client";

/**
 * ClauseDetail Component
 *
 * Displays full clause text in a dialog with copy functionality.
 */

import { Copy } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CLAUSE_CATEGORY_COLORS,
  CLAUSE_CATEGORY_ICONS,
  CLAUSE_CATEGORY_LABELS,
} from "@/src/constants/clauses";
import { copyToClipboard } from "@/src/lib/clipboard";

import type { UiClause } from "@/src/types/clause";

export interface ClauseDetailProps {
  /**
   * Clause to display
   */
  clause: UiClause | null;

  /**
   * Whether dialog is open
   */
  open: boolean;

  /**
   * Callback when dialog close is requested
   */
  onOpenChange: (open: boolean) => void;
}

/**
 * ClauseDetail Dialog Component
 *
 * @example
 * ```tsx
 * const [selectedClause, setSelectedClause] = useState<UiClause | null>(null);
 *
 * <ClauseDetail
 *   clause={selectedClause}
 *   open={!!selectedClause}
 *   onOpenChange={(open) => !open && setSelectedClause(null)}
 * />
 * ```
 */
export function ClauseDetail({ clause, open, onOpenChange }: ClauseDetailProps) {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  if (!clause) return null;

  const colors = CLAUSE_CATEGORY_COLORS[clause.category];
  const Icon = CLAUSE_CATEGORY_ICONS[clause.category];
  const label = CLAUSE_CATEGORY_LABELS[clause.category];

  const handleCopy = async () => {
    if (isCopying) return;

    setIsCopying(true);
    try {
      await copyToClipboard(clause.text);
      toast({
        title: "Copié",
        description: "Le texte de la clause a été copié dans le presse-papiers.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le texte. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Icon className={cn("h-6 w-6", colors.icon)} aria-hidden="true" />
            <DialogTitle className="flex-1">{clause.type}</DialogTitle>
            <Badge
              className={cn(colors.badge, "shrink-0 font-semibold")}
              aria-label={`Catégorie: ${label}`}
            >
              {label}
            </Badge>
          </div>
          <DialogDescription>Texte intégral de la clause</DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap leading-relaxed">{clause.text}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button onClick={handleCopy} disabled={isCopying} className="gap-2">
            <Copy className="h-4 w-4" aria-hidden="true" />
            {isCopying ? "Copié !" : "Copier"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
