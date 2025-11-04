"use client";

/**
 * RedFlagItem Component
 *
 * Displays a single red flag in a card format with severity badge,
 * explanation, and copyable clause excerpt.
 */

import { Copy } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/src/lib/clipboard";
import {
  RED_FLAG_SEVERITY_COLORS,
  RED_FLAG_SEVERITY_ICONS,
  RED_FLAG_SEVERITY_LABELS,
  type UiRedFlag,
} from "@/src/types/red-flag";

export interface RedFlagItemProps {
  /**
   * Red flag data to display
   */
  flag: UiRedFlag;

  /**
   * Additional CSS classes for the card
   */
  className?: string;
}

/**
 * RedFlagItem Component
 *
 * @example
 * ```tsx
 * <RedFlagItem
 *   flag={{
 *     id: "rf_1",
 *     title: "Unclear Termination Clause",
 *     severity: "medium",
 *     why: "The termination conditions are ambiguous and could lead to disputes.",
 *     clause_excerpt: "Either party may terminate this agreement..."
 *   }}
 * />
 * ```
 */
export function RedFlagItem({ flag, className }: RedFlagItemProps) {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  const colors = RED_FLAG_SEVERITY_COLORS[flag.severity];
  const Icon = RED_FLAG_SEVERITY_ICONS[flag.severity];
  const label = RED_FLAG_SEVERITY_LABELS[flag.severity];

  const handleCopy = async () => {
    if (isCopying) return;

    setIsCopying(true);
    try {
      await copyToClipboard(flag.clause_excerpt);
      toast({
        title: "Copied to clipboard",
        description: "Clause excerpt has been copied successfully.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Failed to copy clause excerpt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  // Limit excerpt length (1200-1500 chars)
  const maxLength = 1500;
  const excerpt =
    flag.clause_excerpt.length > maxLength
      ? flag.clause_excerpt.slice(0, maxLength) + "..."
      : flag.clause_excerpt;

  return (
    <Card className={cn("relative", className)} role="article" aria-labelledby={`flag-${flag.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle id={`flag-${flag.id}`} className="flex items-center gap-2 text-lg">
            <Icon className={cn("h-5 w-5", colors.icon)} aria-hidden="true" />
            {flag.title}
          </CardTitle>
          <Badge
            className={cn(colors.badge, "shrink-0 font-semibold")}
            aria-label={`Severity: ${label}`}
          >
            {label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Why explanation */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Why this matters:</p>
          <p className="text-sm leading-relaxed">{flag.why}</p>
        </div>

        {/* Clause excerpt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Clause excerpt:</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={isCopying}
              className="h-8 gap-2"
              aria-label="Copy clause excerpt to clipboard"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              {isCopying ? "Copied!" : "Copy"}
            </Button>
          </div>
          <div
            className={cn(
              "relative max-h-[300px] overflow-y-auto rounded-md border p-4",
              "bg-muted/50 dark:bg-muted/30"
            )}
          >
            <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
              {excerpt}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
