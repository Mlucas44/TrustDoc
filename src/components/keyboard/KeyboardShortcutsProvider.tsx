/**
 * Keyboard Shortcuts Provider
 *
 * Client component that initializes global keyboard shortcuts and help modal.
 * Must be used in a client component context.
 */

"use client";

import { useGlobalKeyboardShortcuts } from "@/src/hooks/useKeyboardShortcuts";

import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";

export function KeyboardShortcutsProvider() {
  // Initialize global keyboard shortcuts
  useGlobalKeyboardShortcuts();

  return (
    <>
      <KeyboardShortcutsHelp />
    </>
  );
}
