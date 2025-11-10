"use client";

/**
 * DashboardUploadSection Component
 *
 * Upload section for dashboard with:
 * - Credit cost information banner
 * - Upload dropzone
 * - Confirmation dialog before analysis
 * - Automatic redirect to analysis results
 */

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UploadDropzone, type UploadResult } from "@/components/upload/upload-dropzone";
import { useToast } from "@/hooks/use-toast";

interface DashboardUploadSectionProps {
  userCredits: number;
}

type AnalysisStep = "preparing" | "analyzing" | "complete";

const STEP_LABELS = {
  preparing: "Parsing du PDF...",
  analyzing: "Analyse LLM en cours...",
  complete: "Finalisation...",
} as const;

export function DashboardUploadSection({ userCredits }: DashboardUploadSectionProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [uploadedFile, setUploadedFile] = useState<UploadResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep | null>(null);
  const [progress, setProgress] = useState(0);

  /**
   * Handle successful upload - show confirmation dialog
   */
  const handleUploadSuccess = (result: UploadResult) => {
    setUploadedFile(result);
    setShowConfirmDialog(true);
  };

  /**
   * Handle upload error
   */
  const handleUploadError = () => {
    toast({
      title: "Erreur d'upload",
      description: "Une erreur est survenue lors de l'upload du fichier.",
      variant: "destructive",
    });
  };

  /**
   * Start analysis after confirmation
   */
  const handleStartAnalysis = async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    setShowConfirmDialog(false);

    try {
      // 1. Prepare the document (parse PDF)
      setAnalysisStep("preparing");
      setProgress(10);

      const prepareRes = await fetch("/api/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: uploadedFile.path }),
      });

      if (!prepareRes.ok) {
        const errorData = await prepareRes.json();
        throw new Error(errorData.error || "Failed to prepare document");
      }

      const { textClean: preparedText } = await prepareRes.json();
      setProgress(40);

      // 2. Start analysis
      setAnalysisStep("analyzing");
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preparedText,
          filename: uploadedFile.filename,
        }),
      });

      if (!analyzeRes.ok) {
        const errorData = await analyzeRes.json();
        throw new Error(errorData.error || "Failed to analyze document");
      }

      const { analysisId } = await analyzeRes.json();
      setProgress(80);

      // 3. Redirect to results
      setAnalysisStep("complete");
      setProgress(100);

      toast({
        title: "Analyse terminée",
        description: "Redirection vers les résultats...",
      });

      router.push(`/analysis/${analysisId}`);
    } catch (error) {
      console.error("Analysis error:", error);

      toast({
        title: "Erreur d'analyse",
        description:
          error instanceof Error ? error.message : "Une erreur est survenue lors de l'analyse.",
        variant: "destructive",
      });

      setIsAnalyzing(false);
      setAnalysisStep(null);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <Alert>
        <AlertDescription className="text-sm">
          <strong>💡 Informations importantes:</strong>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>
              Chaque analyse consomme <strong>1 crédit</strong>
            </li>
            <li>
              Formats acceptés: <strong>PDF uniquement</strong>
            </li>
            <li>
              Taille maximale: <strong>10 Mo</strong>
            </li>
            <li>
              Temps d&apos;analyse estimé: <strong>10-20 secondes</strong>
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Analyser un nouveau contrat</CardTitle>
          <CardDescription>
            {userCredits > 0
              ? "Glissez-déposez un fichier PDF ou cliquez pour sélectionner"
              : "Vous n'avez plus de crédits. Veuillez acheter des crédits pour continuer."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDropzone
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            disabled={userCredits === 0 || isAnalyzing}
          />
        </CardContent>
      </Card>

      {/* Analysis Progress Indicator */}
      {isAnalyzing && analysisStep && (
        <Card className="border-primary">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <p className="font-medium">{STEP_LABELS[analysisStep]}</p>
                <p className="text-sm text-muted-foreground">Temps estimé : 10-20 secondes</p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;analyse</AlertDialogTitle>
            <div className="text-sm text-muted-foreground space-y-3 mt-2">
              <p>
                Vous êtes sur le point de lancer l&apos;analyse du fichier:{" "}
                <strong>{uploadedFile?.filename}</strong>
              </p>

              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">Coût de cette opération:</p>
                <ul className="mt-2 space-y-1">
                  <li>• 1 crédit sera débité</li>
                  <li>
                    • Crédits restants après analyse: <strong>{userCredits - 1}</strong>
                  </li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground">
                L&apos;analyse prendra environ 10-20 secondes. Vous serez redirigé vers les
                résultats une fois terminé.
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAnalyzing}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? "Analyse en cours..." : "Confirmer et analyser"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
