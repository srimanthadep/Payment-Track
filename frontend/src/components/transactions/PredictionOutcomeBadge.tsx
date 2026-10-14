import React from "react";
import { Check, Edit3, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface PredictionTrackingRecord {
  id?: string;
  transaction_id: string;
  all_accepted: boolean;
  commission_accepted: boolean;
  site_fee_accepted: boolean;
  imps_accepted?: boolean | null;
  predicted_commission?: number | string | null;
  actual_commission?: number | string | null;
  predicted_site_fee?: number | string | null;
  actual_site_fee?: number | string | null;
  predicted_imps?: number | string | null;
  actual_imps?: number | string | null;
  prediction_source?: string | null;
  prediction_confidence?: number | string | null;
}

interface PredictionOutcomeBadgeProps {
  prediction?: PredictionTrackingRecord | null;
  variant?: "table" | "card";
  className?: string;
}

export const PredictionOutcomeBadge: React.FC<PredictionOutcomeBadgeProps> = ({
  prediction,
  variant = "table",
  className,
}) => {
  if (!prediction) return null;

  const isAccepted = Boolean(prediction.all_accepted);
  const commAccepted = Boolean(prediction.commission_accepted);
  const feeAccepted = Boolean(prediction.site_fee_accepted);
  const impsAccepted = prediction.imps_accepted !== false;

  const formatPercent = (val?: number | string | null) => {
    if (val === undefined || val === null || val === "") return "0%";
    const num = Number(val);
    if (isNaN(num)) return "0%";
    return Number.isInteger(num) ? `${num}%` : `${num.toFixed(2).replace(/\.?0+$/, "")}%`;
  };

  const formatCurrency = (val?: number | string | null) => {
    if (val === undefined || val === null || val === "") return "₹0";
    const num = Number(val);
    if (isNaN(num)) return "₹0";
    return `₹${num.toLocaleString("en-IN")}`;
  };

  // Human-readable source description
  const formatSource = (src?: string | null) => {
    if (!src || src === "none") return "Default pattern";
    return src
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 font-medium transition-all rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring select-none",
              variant === "table"
                ? "text-[10px] px-1.5 py-0.5 border"
                : "text-[10px] px-2 py-0.5 border rounded-full",
              isAccepted
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
              className
            )}
            title={isAccepted ? "AI Prediction Accepted" : "AI Prediction Overridden"}
          >
            {isAccepted ? (
              <>
                <Check className="h-2.5 w-2.5 stroke-[3] text-emerald-600 dark:text-emerald-400" />
                <span>AI Accepted</span>
              </>
            ) : (
              <>
                <Edit3 className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                <span>AI Overridden</span>
              </>
            )}
          </button>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          align="start"
          className="p-3 max-w-[280px] bg-popover/95 backdrop-blur-md border border-border shadow-xl rounded-xl text-xs space-y-2 z-50 text-popover-foreground animate-in fade-in-0 zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5 gap-2">
            <div className="flex items-center gap-1.5 font-semibold">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isAccepted
                    ? "bg-emerald-500 ring-2 ring-emerald-500/30"
                    : "bg-amber-500 ring-2 ring-amber-500/30"
                )}
              />
              <span className={isAccepted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                {isAccepted ? "AI Prediction Accepted" : "AI Prediction Overridden"}
              </span>
            </div>
            {prediction.prediction_confidence !== undefined &&
              prediction.prediction_confidence !== null &&
              Number(prediction.prediction_confidence) > 0 && (
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1 py-0.2 rounded">
                  {Math.round(Number(prediction.prediction_confidence) * 100)}% conf
                </span>
              )}
          </div>

          {/* Breakdown fields */}
          <div className="space-y-1.5 text-[11px]">
            {/* Commission */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Commission:</span>
              <div className="font-mono text-right">
                {commAccepted ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatPercent(prediction.actual_commission)} (Matched)
                  </span>
                ) : (
                  <span>
                    <span className="line-through text-muted-foreground/60 mr-1">
                      {formatPercent(prediction.predicted_commission)}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      → {formatPercent(prediction.actual_commission)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Site Fee */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Site Fee:</span>
              <div className="font-mono text-right">
                {feeAccepted ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatPercent(prediction.actual_site_fee)} (Matched)
                  </span>
                ) : (
                  <span>
                    <span className="line-through text-muted-foreground/60 mr-1">
                      {formatPercent(prediction.predicted_site_fee)}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      → {formatPercent(prediction.actual_site_fee)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* IMPS Charges */}
            {(prediction.predicted_imps !== undefined || prediction.actual_imps !== undefined) && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">IMPS Charges:</span>
                <div className="font-mono text-right">
                  {impsAccepted ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(prediction.actual_imps)} (Matched)
                    </span>
                  ) : (
                    <span>
                      <span className="line-through text-muted-foreground/60 mr-1">
                        {formatCurrency(prediction.predicted_imps)}
                      </span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        → {formatCurrency(prediction.actual_imps)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Prediction Engine Source */}
            {prediction.prediction_source && prediction.prediction_source !== "none" && (
              <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Engine:
                </span>
                <span className="font-medium text-foreground">
                  {formatSource(prediction.prediction_source)}
                </span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
