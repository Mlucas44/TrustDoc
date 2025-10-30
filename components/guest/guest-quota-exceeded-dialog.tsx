"use client";

/**
 * GuestQuotaExceededDialog Component
 *
 * Modal dialog shown when guest quota is exceeded.
 * Prompts user to sign in or create an account to continue.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GuestQuotaExceededDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;
  /**
   * Callback when dialog open state changes
   */
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog shown when guest exceeds their free quota
 *
 * @example
 * ```tsx
 * const [showDialog, setShowDialog] = useState(false);
 *
 * <GuestQuotaExceededDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 * />
 * ```
 */
export function GuestQuotaExceededDialog({ open, onOpenChange }: GuestQuotaExceededDialogProps) {
  const pathname = usePathname();
  const callbackUrl = encodeURIComponent(pathname);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quota invité épuisé</DialogTitle>
          <DialogDescription>
            Vous avez utilisé vos 3 analyses gratuites en mode invité.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Pour continuer à analyser vos documents, vous pouvez :
          </p>

          <div className="space-y-2">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <svg
                  className="h-4 w-4 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium">Se connecter</h4>
                <p className="text-xs text-muted-foreground">
                  Accédez à vos crédits et historique d&apos;analyses
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                <svg
                  className="h-4 w-4 text-green-600 dark:text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium">Créer un compte</h4>
                <p className="text-xs text-muted-foreground">
                  Obtenez 3 crédits gratuits à l&apos;inscription
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full">
            <Link href={`/auth/signin?callbackUrl=${callbackUrl}`}>Se connecter</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
