import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, FileQuestion, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20 ${className}`}
    >
      <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
        {icon || <FileQuestion className="h-8 w-8 text-primary" />}
      </div>

      <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
              className="text-xs h-9"
            >
              {secondaryActionLabel}
            </Button>
          )}

          {actionLabel && onAction && (
            <Button
              size="sm"
              onClick={onAction}
              className="text-xs h-9 gap-1.5 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};
