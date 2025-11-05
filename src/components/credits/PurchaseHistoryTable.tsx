/**
 * Purchase History Table Component
 *
 * Displays user's credit purchase history with:
 * - Date, Pack, Credits, Amount, Reference columns
 * - Filters: date range (7/30/90 days / All), pack type
 * - Cursor-based pagination
 * - Empty state when no purchases
 * - Responsive: mobile shows cards, desktop shows table
 */

"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface HistoryItem {
  id: string;
  createdAt: string;
  pack: string;
  credits: number;
  amountCents: number;
  currency: string;
  stripeEventId: string;
}

interface HistoryResponse {
  items: HistoryItem[];
  nextCursor?: string;
  hasMore: boolean;
}

const DATE_RANGES = {
  "7": "7 derniers jours",
  "30": "30 derniers jours",
  "90": "90 derniers jours",
  all: "Tout",
} as const;

const PACK_FILTERS = {
  all: "Tous les packs",
  STARTER: "Pack Starter",
  PRO: "Pack Pro",
  SCALE: "Pack Scale",
} as const;

export function PurchaseHistoryTable() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [dateRange, setDateRange] = useState<keyof typeof DATE_RANGES>("all");
  const [packFilter, setPackFilter] = useState<keyof typeof PACK_FILTERS>("all");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [history, setHistory] = useState<string[]>([]); // For pagination history
  const { toast } = useToast();

  // Fetch history data
  const fetchHistory = async (newCursor?: string, isPrevious = false) => {
    setLoading(true);

    try {
      // Build query params
      const params = new URLSearchParams({
        limit: "10",
      });

      if (newCursor) {
        params.append("cursor", newCursor);
      }

      if (packFilter !== "all") {
        params.append("pack", packFilter);
      }

      if (dateRange !== "all") {
        const days = parseInt(dateRange);
        const from = new Date();
        from.setDate(from.getDate() - days);
        params.append("from", from.toISOString());
      }

      const response = await fetch(`/api/billing/history?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch purchase history");
      }

      const result: HistoryResponse = await response.json();
      setData(result);

      // Update cursor and history for pagination
      if (!isPrevious) {
        setCursor(newCursor);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des achats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial load and reload on filter change
  useEffect(() => {
    fetchHistory(undefined);
    setHistory([]);
    setCursor(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, packFilter]);

  // Handle next page
  const handleNext = () => {
    if (data?.hasMore && data.nextCursor) {
      if (cursor) {
        setHistory([...history, cursor]);
      }
      fetchHistory(data.nextCursor);
    }
  };

  // Handle previous page
  const handlePrevious = () => {
    if (history.length > 0) {
      const previousCursor = history[history.length - 1];
      setHistory(history.slice(0, -1));
      fetchHistory(previousCursor, true);
    } else {
      setHistory([]);
      fetchHistory(undefined, true);
    }
  };

  // Format currency
  const formatCurrency = (amountCents: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: fr });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des achats</CardTitle>
        <CardDescription>
          Consultez vos transactions passées et téléchargez vos reçus
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Select
              value={dateRange}
              onValueChange={(v: string) => setDateRange(v as keyof typeof DATE_RANGES)}
            >
              <SelectTrigger aria-label="Filtrer par période">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATE_RANGES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select
              value={packFilter}
              onValueChange={(v: string) => setPackFilter(v as keyof typeof PACK_FILTERS)}
            >
              <SelectTrigger aria-label="Filtrer par pack">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PACK_FILTERS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && data && data.items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Aucun achat pour l&apos;instant</p>
            <p className="text-sm text-muted-foreground">
              Commencez avec un pack STARTER pour analyser vos premiers documents
            </p>
          </div>
        )}

        {/* Table (desktop) */}
        {!loading && data && data.items.length > 0 && (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pack</TableHead>
                    <TableHead>Crédits</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Référence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        <span className="font-medium">Pack {item.pack}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600 font-medium">+{item.credits}</span>
                      </TableCell>
                      <TableCell>{formatCurrency(item.amountCents, item.currency)}</TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">{item.stripeEventId}</code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Cards (mobile) */}
            <div className="md:hidden space-y-4">
              {data.items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                        <span className="font-medium">Pack {item.pack}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Crédits</span>
                        <span className="text-green-600 font-medium">+{item.credits}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Montant</span>
                        <span className="font-medium">
                          {formatCurrency(item.amountCents, item.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Référence</span>
                        <code className="text-xs text-muted-foreground">{item.stripeEventId}</code>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={history.length === 0 && !cursor}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>

              <div className="text-sm text-muted-foreground">Page {history.length + 1}</div>

              <Button variant="outline" size="sm" onClick={handleNext} disabled={!data.hasMore}>
                Suivant
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
