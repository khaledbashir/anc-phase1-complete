"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PipelineCheckpointProps {
  /** Number of rows/specs still flagged for review */
  unconfirmedCount: number;
  /** Callback to move to next tab/stage */
  onProceed: () => void;
  /** Label for the next stage button */
  nextStageLabel: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Review gate at the bottom of a pipeline tab.
 * Disabled until all flagged items are reviewed (unconfirmedCount === 0).
 */
export default function PipelineCheckpoint({
  unconfirmedCount,
  onProceed,
  nextStageLabel,
}: PipelineCheckpointProps) {
  const allReviewed = unconfirmedCount === 0;

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
      allReviewed
        ? "bg-[#0A52EF]/5 border-[#0A52EF]/20"
        : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30"
    }`}>
      <div className="flex items-center gap-2">
        {allReviewed ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-[#0A52EF]" />
            <span className="text-xs font-medium text-[#0A52EF]">All items reviewed.</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Review {unconfirmedCount} flagged item{unconfirmedCount !== 1 ? "s" : ""} before continuing.
            </span>
          </>
        )}
      </div>
      <button
        onClick={onProceed}
        disabled={!allReviewed}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
          allReviewed
            ? "bg-[#0A52EF] text-white hover:bg-[#0941c3] shadow-sm"
            : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
        }`}
      >
        {nextStageLabel}
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
