/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays available keyboard shortcuts in a modal dialog.
 * Opens when user presses Ctrl/Cmd + / or via custom event.
 */

"use client";

import { Keyboard } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: ["Ctrl", "D"], description: "Aller au dashboard" },
  { keys: ["Ctrl", "H"], description: "Voir l'historique des analyses" },
  { keys: ["Ctrl", "/"], description: "Afficher cette aide" },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const [isMac] = useState(() => {
    // Detect if user is on Mac during initialization
    if (typeof window !== "undefined") {
      return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    }
    return false;
  });

  useEffect(() => {
    // Listen for custom event to show shortcuts
    function handleShowShortcuts() {
      setOpen(true);
    }

    window.addEventListener("show-shortcuts-help", handleShowShortcuts);
    return () => window.removeEventListener("show-shortcuts-help", handleShowShortcuts);
  }, []);

  // Replace "Ctrl" with "Cmd" on Mac
  const formatKey = (key: string) => {
    if (isMac && key === "Ctrl") {
      return "⌘";
    }
    return key;
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </AlertDialogTitle>
          <AlertDialogDescription>
            Utilisez ces raccourcis pour naviguer plus rapidement dans TrustDoc
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 my-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-sm">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex} className="flex items-center gap-1">
                    <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                      {formatKey(key)}
                    </Badge>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="text-xs text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogAction>Fermer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
