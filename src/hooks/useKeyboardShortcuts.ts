/**
 * Keyboard Shortcuts Hook
 *
 * Provides global keyboard shortcuts for common actions.
 * Uses Command/Ctrl + key combinations for cross-platform support.
 *
 * Shortcuts:
 * - Ctrl/Cmd + K: Focus search (if available)
 * - Ctrl/Cmd + /: Show keyboard shortcuts help
 * - Ctrl/Cmd + D: Navigate to dashboard
 * - Ctrl/Cmd + H: Navigate to history
 * - Ctrl/Cmd + U: Focus upload (on dashboard)
 */

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't trigger shortcuts when user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Check each shortcut
      for (const shortcut of shortcuts) {
        const ctrlPressed = event.ctrlKey || event.metaKey; // Support both Ctrl (Windows/Linux) and Cmd (Mac)
        const shiftPressed = event.shiftKey;
        const altPressed = event.altKey;

        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl === undefined || shortcut.ctrl === ctrlPressed;
        const shiftMatches = shortcut.shift === undefined || shortcut.shift === shiftPressed;
        const altMatches = shortcut.alt === undefined || shortcut.alt === altPressed;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

/**
 * Global keyboard shortcuts used across the app
 */
export function useGlobalKeyboardShortcuts() {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: "d",
      ctrl: true,
      description: "Aller au dashboard",
      action: () => router.push("/dashboard"),
    },
    {
      key: "h",
      ctrl: true,
      description: "Voir l'historique",
      action: () => router.push("/history"),
    },
    {
      key: "/",
      ctrl: true,
      description: "Afficher l'aide des raccourcis",
      action: () => {
        // Trigger a custom event to show shortcuts modal
        window.dispatchEvent(new CustomEvent("show-shortcuts-help"));
      },
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
