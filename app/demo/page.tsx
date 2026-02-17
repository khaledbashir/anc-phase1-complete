"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { FEATURE_IDEAS } from "./data/featureIdeas";
import DemoFeatureGrid from "./components/DemoFeatureGrid";

type Filter = "all" | "concept" | "development" | "live";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "development", label: "Building" },
  { key: "concept", label: "Concepts" },
];

export default function DemoPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(
    () =>
      filter === "all"
        ? FEATURE_IDEAS
        : FEATURE_IDEAS.filter((f) => f.status === filter),
    [filter]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#0A52EF] mb-2">
            ANC Sales Tools
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1.5">
            Sales Toolkit
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Revenue tools that help close bigger deals. Vote on what to build next.
          </p>
        </div>
      </div>

      {/* Filters + Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-8">
          {FILTERS.map((f) => {
            const count = f.key === "all"
              ? FEATURE_IDEAS.length
              : FEATURE_IDEAS.filter((feat) => feat.status === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150",
                  filter === f.key
                    ? "bg-[#0A52EF] text-white border-[#0A52EF]"
                    : "bg-background text-muted-foreground border-border/60 hover:border-border hover:text-foreground"
                )}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <DemoFeatureGrid features={filtered} />
      </div>
    </div>
  );
}
