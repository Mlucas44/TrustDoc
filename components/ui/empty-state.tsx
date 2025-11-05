/**
 * Empty State Component
 *
 * Reusable component for displaying empty states with icon, title, description,
 * and optional action button.
 *
 * Usage:
 * ```tsx
 * <EmptyState
 *   icon={FileX}
 *   title="Aucune analyse"
 *   description="Vous n'avez pas encore analysé de document."
 *   action={
 *     <Button onClick={handleUpload}>
 *       Analyser un document
 *     </Button>
 *   }
 * />
 * ```
 */

import { type LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /**
   * Icon to display (Lucide icon component)
   */
  icon: LucideIcon;

  /**
   * Title text
   */
  title: string;

  /**
   * Description text (optional)
   */
  description?: string;

  /**
   * Action button or element (optional)
   */
  action?: React.ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 space-y-4",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>

      {/* Text Content */}
      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      {/* Action */}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
