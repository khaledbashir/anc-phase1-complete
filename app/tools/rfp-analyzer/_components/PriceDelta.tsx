"use client";

import React from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PriceDeltaProps {
  /** Actual cost used (from quote or rate card) */
  quotePrice: number;
  /** Rate card estimate for comparison */
  estimatePrice: number;
  /** Format helper */
  formatter?: (n: number) => string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Shows the delta between a quoted price and a rate card estimate.
 * - Red ▲ if quote exceeds estimate by > 5%
 * - Green ▼ if quote is under estimate by > 5%
 * - Gray — if within 5% tolerance
 */
export default function PriceDelta({ quotePrice, estimatePrice, formatter }: PriceDeltaProps) {
  if (estimatePrice <= 0) return null;

  const delta = quotePrice - estimatePrice;
  const pct = (delta / estimatePrice) * 100;
  const absPct = Math.abs(pct);
  const fmt = formatter || ((n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);

  if (absPct <= 5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-gray-400">
        ≈ est.
      </span>
    );
  }

  if (pct > 5) {
    // Quote is HIGHER than estimate — cost overrun
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-red-500">
        <span>▲</span>
        <span>+{fmt(delta)}</span>
        <span className="text-red-400">({absPct.toFixed(0)}%)</span>
      </span>
    );
  }

  // Quote is LOWER than estimate — savings
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-emerald-500">
      <span>▼</span>
      <span>−{fmt(delta)}</span>
      <span className="text-emerald-400">({absPct.toFixed(0)}%)</span>
    </span>
  );
}
