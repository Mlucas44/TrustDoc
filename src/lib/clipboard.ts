/**
 * Clipboard Utilities
 *
 * Helper functions for clipboard operations.
 */

/**
 * Copy text to clipboard
 *
 * @param text - Text to copy
 * @returns Promise that resolves when copy is successful
 *
 * @example
 * ```ts
 * await copyToClipboard("Hello world");
 * toast({ title: "Copied!", description: "Text copied to clipboard" });
 * ```
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return;
  }

  await navigator.clipboard.writeText(text);
}
