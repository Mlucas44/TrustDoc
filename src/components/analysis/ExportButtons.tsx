"use client";

/**
 * Export Buttons Component
 *
 * Provides JSON and Markdown export buttons for analysis results.
 * Handles download, loading state, and toast notifications.
 */

import { Download, FileJson, FileText } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export interface ExportButtonsProps {
  /**
   * Analysis ID to export
   */
  analysisId: string;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Button size
   */
  size?: "default" | "sm" | "lg";
}

/**
 * ExportButtons Component
 *
 * @example
 * ```tsx
 * <ExportButtons analysisId="123abc" />
 * ```
 */
export function ExportButtons({ analysisId, className, size = "default" }: ExportButtonsProps) {
  const { toast } = useToast();
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingMd, setIsExportingMd] = useState(false);

  /**
   * Handle JSON export
   */
  const handleExportJson = async () => {
    setIsExportingJson(true);
    try {
      const response = await fetch(`/api/analysis/${analysisId}/export.json`);

      if (!response.ok) {
        throw new Error("Échec de l'export");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `analysis-${analysisId}.json`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Le fichier JSON a été téléchargé.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d&apos;exporter l&apos;analyse en JSON.",
        variant: "destructive",
      });
    } finally {
      setIsExportingJson(false);
    }
  };

  /**
   * Handle Markdown export
   */
  const handleExportMd = async () => {
    setIsExportingMd(true);
    try {
      const response = await fetch(`/api/analysis/${analysisId}/export.md`);

      if (!response.ok) {
        throw new Error("Échec de l'export");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `analysis-${analysisId}.md`;

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export réussi",
        description: "Le fichier Markdown a été téléchargé.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d&apos;exporter l&apos;analyse en Markdown.",
        variant: "destructive",
      });
    } finally {
      setIsExportingMd(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleExportJson}
          disabled={isExportingJson || isExportingMd}
          variant="outline"
          size={size}
          className="gap-2"
        >
          {isExportingJson ? (
            <>
              <Download className="h-4 w-4 animate-pulse" />
              Export...
            </>
          ) : (
            <>
              <FileJson className="h-4 w-4" />
              Exporter JSON
            </>
          )}
        </Button>

        <Button
          onClick={handleExportMd}
          disabled={isExportingJson || isExportingMd}
          variant="outline"
          size={size}
          className="gap-2"
        >
          {isExportingMd ? (
            <>
              <Download className="h-4 w-4 animate-pulse" />
              Export...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Exporter Markdown
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
