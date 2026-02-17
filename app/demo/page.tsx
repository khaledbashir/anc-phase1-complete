"use client";

import { useState, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURE_IDEAS } from "./data/featureIdeas";
import DemoFeatureGrid from "./components/DemoFeatureGrid";

type Filter = "all" | "concept" | "development" | "live";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live Demos" },
  { key: "development", label: "In Development" },
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
      {/* Hero */}
      <div className="relative border-b border-border bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Phase 3 Lab
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            Sales Toolkit
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Revenue-focused tools that help close bigger deals. Vote on what matters most.
            Features marked <span className="text-emerald-600 font-medium">Live Demo</span> are
            working prototypes you can try right now.
          </p>
        </div>
      </div>

      {/* Filters + Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-8">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground"
              )}
            >
              {f.label}
              {f.key !== "all" && (
                <span className="ml-1.5 tabular-nums">
                  ({FEATURE_IDEAS.filter((feat) => f.key === "all" || feat.status === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <DemoFeatureGrid features={filtered} />
      </div>
    </div>
  );
}
