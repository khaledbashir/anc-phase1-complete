"use client";

import { useEffect, useState } from "react";

interface PricingSummaryProps {
  activeCount: number;
  totalCount: number;
  totalHardwareCost: number;
  totalSellPrice: number;
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// Animated counter that smoothly transitions between values
function useAnimatedValue(target: number, duration = 400): number {
  const [display, setDisplay] = useState(target);

  useEffect(() => {
    const start = display;
    const diff = target - start;
    if (Math.abs(diff) < 1) {
      setDisplay(target);
      return;
    }
    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}

export default function PricingSummary({
  activeCount,
  totalCount,
  totalHardwareCost,
  totalSellPrice,
}: PricingSummaryProps) {
  const animatedTotal = useAnimatedValue(totalSellPrice);
  const animatedHardware = useAnimatedValue(totalHardwareCost);
  const remaining = totalCount - activeCount;
  const pct = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-3 w-full">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            {activeCount} of {totalCount} display zones
          </span>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            {Math.round(pct)}%
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Cost lines */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">LED Hardware Cost</span>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            {formatPrice(animatedHardware)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Estimated Project Total</span>
          <span className="text-lg font-bold font-mono tabular-nums text-primary">
            {formatPrice(animatedTotal)}
          </span>
        </div>
      </div>

      {/* Upsell nudge */}
      {remaining > 0 && activeCount > 0 && (
        <p className="text-xs text-amber-600 font-medium">
          {remaining} display zone{remaining > 1 ? "s" : ""} remaining
        </p>
      )}

      {activeCount === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Toggle display zones to see live pricing
        </p>
      )}
    </div>
  );
}
