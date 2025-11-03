"use client";

/**
 * ClausesTable Component
 *
 * Displays contract clauses in a filterable, searchable table with responsive design.
 * Desktop: Full table | Mobile: Stacked cards
 */

import { Copy, Eye, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CLAUSE_CATEGORY_COLORS,
  CLAUSE_CATEGORY_ICONS,
  CLAUSE_CATEGORY_LABELS,
} from "@/src/constants/clauses";
import { copyToClipboard } from "@/src/lib/clipboard";

import { ClauseDetail } from "./ClauseDetail";

import type { ClauseCategory, UiClause } from "@/src/types/clause";

export interface ClausesTableProps {
  /**
   * Array of clauses to display
   */
  clauses: UiClause[];

  /**
   * Additional CSS classes
   */
  className?: string;
}

type SortField = "type" | "length";
type SortDirection = "asc" | "desc";

/**
 * ClausesTable Component
 *
 * @example
 * ```tsx
 * <ClausesTable clauses={uiClauses} />
 * ```
 */
export function ClausesTable({ clauses, className }: ClausesTableProps) {
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<ClauseCategory>>(new Set());
  const [sortField, setSortField] = useState<SortField>("type");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedClause, setSelectedClause] = useState<UiClause | null>(null);

  // Filtering and sorting
  const filteredClauses = useMemo(() => {
    let result = [...clauses];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (clause) =>
          clause.type.toLowerCase().includes(query) || clause.text.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategories.size > 0) {
      result = result.filter((clause) => selectedCategories.has(clause.category));
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      if (sortField === "type") {
        comparison = a.type.localeCompare(b.type);
      } else if (sortField === "length") {
        comparison = b.text.length - a.text.length; // Desc by default for length
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [clauses, searchQuery, selectedCategories, sortField, sortDirection]);

  // Category toggle handler
  const toggleCategory = (category: ClauseCategory) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(category)) {
      newSelected.delete(category);
    } else {
      newSelected.add(category);
    }
    setSelectedCategories(newSelected);
  };

  // Copy handlers
  const handleCopyPreview = async (clause: UiClause) => {
    try {
      await copyToClipboard(clause.preview);
      toast({
        title: "Copié",
        description: "L'extrait a été copié dans le presse-papiers.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier l'extrait.",
        variant: "destructive",
      });
    }
  };

  const handleCopyFull = async (clause: UiClause) => {
    try {
      await copyToClipboard(clause.text);
      toast({
        title: "Copié",
        description: "Le texte complet a été copié dans le presse-papiers.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le texte.",
        variant: "destructive",
      });
    }
  };

  // Get unique categories from clauses
  const availableCategories = useMemo(() => {
    const cats = new Set(clauses.map((c) => c.category));
    return Array.from(cats).sort();
  }, [clauses]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Toolbar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="clause-search" className="text-sm font-medium">
              Rechercher
            </Label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="clause-search"
                type="search"
                placeholder="Rechercher par type ou contenu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Rechercher dans les clauses"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-2 sm:w-48">
            <Label htmlFor="clause-sort" className="text-sm font-medium">
              Trier par
            </Label>
            <select
              id="clause-sort"
              value={`${sortField}-${sortDirection}`}
              onChange={(e) => {
                const [field, dir] = e.target.value.split("-") as [SortField, SortDirection];
                setSortField(field);
                setSortDirection(dir);
              }}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Trier les clauses"
            >
              <option value="type-asc">Type (A-Z)</option>
              <option value="type-desc">Type (Z-A)</option>
              <option value="length-desc">Longueur (décroissant)</option>
              <option value="length-asc">Longueur (croissant)</option>
            </select>
          </div>
        </div>

        {/* Category filters */}
        {availableCategories.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filtrer par catégorie</Label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((category) => {
                const colors = CLAUSE_CATEGORY_COLORS[category];
                const Icon = CLAUSE_CATEGORY_ICONS[category];
                const label = CLAUSE_CATEGORY_LABELS[category];
                const isSelected = selectedCategories.has(category);

                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      isSelected ? colors.badge : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    aria-pressed={isSelected}
                    aria-label={`Filtrer par ${label}`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Count */}
        <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {filteredClauses.length === clauses.length
            ? `${clauses.length} clause${clauses.length !== 1 ? "s" : ""}`
            : `${filteredClauses.length} sur ${clauses.length} clause${clauses.length !== 1 ? "s" : ""}`}
        </div>
      </div>

      {/* Content: Table (Desktop) or Cards (Mobile) */}
      {filteredClauses.length > 0 ? (
        <>
          {/* Desktop Table (hidden on mobile) */}
          <div className="hidden sm:block overflow-x-auto rounded-md border">
            <table className="w-full" aria-label="Tableau des clauses">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Clause</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Extrait</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClauses.map((clause) => {
                  const colors = CLAUSE_CATEGORY_COLORS[clause.category];
                  const Icon = CLAUSE_CATEGORY_ICONS[clause.category];
                  const label = CLAUSE_CATEGORY_LABELS[clause.category];

                  return (
                    <tr key={clause.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon
                            className={cn("h-4 w-4 shrink-0", colors.icon)}
                            aria-hidden="true"
                          />
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{clause.type}</p>
                            <Badge className={cn(colors.badge, "text-xs font-semibold")}>
                              {label}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {clause.preview}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyPreview(clause)}
                            className="h-8"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="sr-only">Copier l&apos;extrait</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedClause(clause)}
                            className="h-8 gap-1"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">Voir</span>
                            <span className="sr-only lg:not-sr-only">Afficher plus</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (shown only on mobile) */}
          <div className="sm:hidden space-y-3">
            {filteredClauses.map((clause) => {
              const colors = CLAUSE_CATEGORY_COLORS[clause.category];
              const Icon = CLAUSE_CATEGORY_ICONS[clause.category];
              const label = CLAUSE_CATEGORY_LABELS[clause.category];

              return (
                <Card key={clause.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Icon className={cn("h-4 w-4 shrink-0", colors.icon)} aria-hidden="true" />
                        <p className="font-medium text-sm">{clause.type}</p>
                      </div>
                      <Badge className={cn(colors.badge, "text-xs font-semibold shrink-0")}>
                        {label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{clause.preview}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedClause(clause)}
                        className="flex-1 gap-2"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Voir plus
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyFull(clause)}
                        className="gap-2"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copier
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        /* Empty state */
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
            <h3 className="font-semibold text-lg mb-2">Aucune clause trouvée</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {searchQuery || selectedCategories.size > 0
                ? "Essayez d&apos;ajuster vos critères de recherche ou de filtre."
                : "Aucune clause n&apos;a été extraite de ce contrat."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <ClauseDetail
        clause={selectedClause}
        open={!!selectedClause}
        onOpenChange={(open) => !open && setSelectedClause(null)}
      />
    </div>
  );
}
