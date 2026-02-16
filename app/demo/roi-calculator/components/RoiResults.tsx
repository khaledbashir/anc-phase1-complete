"use client";

import { TrendingUp, Clock, DollarSign, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoiResults as RoiResultsType } from "../hooks/useRoiCalculation";

function formatPrice(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    return `$${(n / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function RoiResults({
  results,
  projectCost,
}: {
  results: RoiResultsType;
  projectCost: number;
}) {
  const paybackText =
    results.paybackMonths === Infinity
      ? "N/A"
      : results.paybackMonths < 12
        ? `${Math.round(results.paybackMonths)} months`
        : `${(results.paybackMonths / 12).toFixed(1)} years`;

  return (
    <div className="space-y-6">
      {/* Hero headline */}
      <div className="text-center py-6 px-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-2">
          Payback Period
        </p>
        <p className="text-4xl font-bold text-foreground mb-1">{paybackText}</p>
        <p className="text-sm text-muted-foreground">
          This {formatPrice(projectCost)} investment pays for itself
          {results.paybackMonths < 24 ? " fast" : ""}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon={DollarSign}
          label="Annual Ad Revenue"
          value={formatPrice(results.annualAdRevenue)}
          color="text-emerald-600"
        />
        <KpiCard
          icon={Target}
          label="Annual Sponsorship"
          value={formatPrice(results.annualSponsorRevenue)}
          color="text-blue-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="5-Year ROI"
          value={`${Math.round(results.fiveYearRoi)}%`}
          color="text-primary"
        />
        <KpiCard
          icon={Clock}
          label="5-Year Profit"
          value={formatPrice(results.fiveYearProfit)}
          color={results.fiveYearProfit >= 0 ? "text-emerald-600" : "text-destructive"}
        />
      </div>

      {/* Bar chart: cumulative revenue vs cost */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Revenue vs Cost (5 Years)
        </h3>
        <div className="space-y-2">
          {results.yearlyBreakdown.map((yr) => {
            const maxVal = Math.max(results.yearlyBreakdown[4].cumulativeRevenue, projectCost);
            const revPct = maxVal > 0 ? (yr.cumulativeRevenue / maxVal) * 100 : 0;
            const costPct = maxVal > 0 ? (projectCost / maxVal) * 100 : 0;
            const isProfitable = yr.profit >= 0;

            return (
              <div key={yr.year} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">
                  Y{yr.year}
                </span>
                <div className="flex-1 relative h-6">
                  {/* Cost reference line */}
                  <div
                    className="absolute top-0 h-full border-r border-dashed border-destructive/30"
                    style={{ left: `${costPct}%` }}
                  />
                  {/* Revenue bar */}
                  <div
                    className={cn(
                      "h-full rounded-sm transition-all duration-500",
                      isProfitable ? "bg-emerald-500/70" : "bg-amber-500/70"
                    )}
                    style={{ width: `${Math.min(revPct, 100)}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs font-mono tabular-nums w-20 text-right shrink-0",
                    isProfitable ? "text-emerald-600" : "text-amber-600"
                  )}
                >
                  {isProfitable ? "+" : ""}
                  {formatPrice(yr.profit)}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-3 pt-1">
            <span className="w-8" />
            <div className="flex-1 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-3 h-2 rounded-sm bg-emerald-500/70" /> Revenue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0 border-t border-dashed border-destructive/50" /> Cost
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("w-3.5 h-3.5", color)} />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("text-lg font-bold font-mono tabular-nums", color)}>{value}</p>
    </div>
  );
}
