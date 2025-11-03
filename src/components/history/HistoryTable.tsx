"use client";

/**
 * HistoryTable Component
 *
 * Displays user's analysis history with filters, search, and pagination.
 * Desktop: Full table | Mobile: Card list
 */

import { FileText, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiskScoreBadge } from "@/src/components/analysis/RiskScoreBadge";

import type { ContractType } from "@prisma/client";

export interface HistoryItem {
  id: string;
  filename: string;
  type: ContractType | null;
  riskScore: number;
  createdAt: Date;
}

export interface HistoryTableProps {
  items: HistoryItem[];
  nextCursor?: string;
  prevCursor?: string;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  FREELANCE: "Freelance",
  CGU: "CGU",
  NDA: "NDA",
  EMPLOYMENT: "Emploi",
  PARTNERSHIP: "Partenariat",
  OTHER: "Autre",
};

export function HistoryTable({ items, nextCursor, prevCursor }: HistoryTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams);
    if (searchQuery) {
      params.set("q", searchQuery);
    } else {
      params.delete("q");
    }
    params.delete("cursor"); // Reset to first page
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleReset = () => {
    setSearchQuery("");
    startTransition(() => {
      router.push("/history");
    });
  };

  const handleNext = () => {
    if (!nextCursor) return;
    const params = new URLSearchParams(searchParams);
    params.set("cursor", nextCursor);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handlePrev = () => {
    if (!prevCursor) return;
    const params = new URLSearchParams(searchParams);
    params.set("cursor", prevCursor);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="search" className="text-sm font-medium mb-2 block">
            Rechercher
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                type="search"
                placeholder="Nom du fichier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={isPending}>
              Rechercher
            </Button>
          </div>
        </div>

        {(searchParams.get("q") || searchParams.get("type") || searchParams.get("riskMin")) && (
          <div className="flex items-end">
            <Button variant="outline" onClick={handleReset} disabled={isPending}>
              <X className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          </div>
        )}
      </div>

      {/* Table (Desktop) */}
      {items.length > 0 ? (
        <>
          <div className="hidden sm:block rounded-md border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Fichier</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Risque</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{item.filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {item.type ? CONTRACT_TYPE_LABELS[item.type] || item.type : "Non spécifié"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <RiskScoreBadge score={item.riskScore} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/analysis/${item.id}`}>Ouvrir</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card List (Mobile) */}
          <div className="sm:hidden space-y-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{item.filename}</span>
                    </div>
                    <RiskScoreBadge score={item.riskScore} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {item.type ? CONTRACT_TYPE_LABELS[item.type] || item.type : "Non spécifié"}
                    </Badge>
                    <span className="text-xs">{formatDate(item.createdAt)}</span>
                  </div>

                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/analysis/${item.id}`}>Ouvrir l&apos;analyse</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {(prevCursor || nextCursor) && (
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={handlePrev} disabled={!prevCursor || isPending}>
                Précédent
              </Button>
              <Button variant="outline" onClick={handleNext} disabled={!nextCursor || isPending}>
                Suivant
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Aucune analyse</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              {searchQuery
                ? "Aucune analyse ne correspond à vos critères de recherche."
                : "Vous n&apos;avez pas encore d&apos;analyse. Importez un PDF pour commencer."}
            </p>
            <Button asChild>
              <Link href="/">Importer un contrat</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
