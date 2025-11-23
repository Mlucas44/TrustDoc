"use client";

/**
 * PDF Password Dialog Component
 *
 * Minimal dialog for entering password when PDF is encrypted.
 * Shows when API returns 401 PASSWORD_REQUIRED or PASSWORD_INVALID.
 *
 * Usage:
 * ```tsx
 * <PdfPasswordDialog
 *   open={showPasswordDialog}
 *   onOpenChange={setShowPasswordDialog}
 *   onSubmit={(password) => retryWithPassword(password)}
 *   isInvalidPassword={passwordWasWrong}
 * />
 * ```
 */

import { Lock } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PdfPasswordDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;

  /**
   * Callback when open state changes
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Callback when password is submitted
   */
  onSubmit: (password: string) => void;

  /**
   * Whether the previously entered password was invalid
   * Shows error message if true
   */
  isInvalidPassword?: boolean;

  /**
   * Whether the dialog is in loading state (submitting password)
   */
  isLoading?: boolean;
}

export function PdfPasswordDialog({
  open,
  onOpenChange,
  onSubmit,
  isInvalidPassword = false,
  isLoading = false,
}: PdfPasswordDialogProps) {
  const [password, setPassword] = useState("");

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) return;

    onSubmit(password);
    // Don't clear password yet - let parent component handle it after success/failure
  };

  /**
   * Handle dialog close
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setPassword(""); // Clear password when dialog closes
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>PDF protégé par mot de passe</DialogTitle>
          </div>
          <DialogDescription>
            Ce document est chiffré. Veuillez entrer le mot de passe pour continuer l&apos;analyse.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdf-password">Mot de passe</Label>
            <Input
              id="pdf-password"
              type="password"
              placeholder="Entrez le mot de passe du PDF"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoFocus
              className={isInvalidPassword ? "border-destructive" : ""}
            />
            {isInvalidPassword && (
              <p className="text-sm text-destructive">
                Le mot de passe est incorrect. Veuillez réessayer.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!password.trim() || isLoading}>
              {isLoading ? "Vérification..." : "Continuer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
