"use client";

import React, { useState } from "react";
import type { AnalyzedPage, PageCategory } from "@/services/rfp/unified/types";
import {
  Monitor,
  PenTool,
  DollarSign,
  FileText,
  Wrench,
  Scale,
  Calendar,
  FileQuestion,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";

interface PageGridProps {
  pages: AnalyzedPage[];
  selectedPages: Set<number>;
  onToggleSelect: (pageIndex: number) => void;
  onPageClick: (page: AnalyzedPage) => void;
  activePage?: number | null;
}

const CATEGORY_CONFIG: Record<PageCategory, { icon: typeof Monitor; color: string; label: string }> = {
  led_specs: { icon: Monitor, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30", label: "LED Specs" },
  drawing: { icon: PenTool, color: "text-blue-500 bg-blue-500/10 border-blue-500/30", label: "Drawing" },
  cost_schedule: { icon: DollarSign, color: "text-amber-500 bg-amber-500/10 border-amber-500/30", label: "Cost" },
  scope_of_work: { icon: FileText, color: "text-purple-500 bg-purple-500/10 border-purple-500/30", label: "SOW" },
  technical: { icon: Wrench, color: "text-orange-500 bg-orange-500/10 border-orange-500/30", label: "Technical" },
  legal: { icon: Scale, color: "text-slate-400 bg-slate-400/10 border-slate-400/30", label: "Legal" },
  boilerplate: { icon: FileQuestion, color: "text-slate-400 bg-slate-400/10 border-slate-400/30", label: "Boilerplate" },
  schedule: { icon: Calendar, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30", label: "Schedule" },
  unknown: { icon: FileQuestion, color: "text-slate-400 bg-slate-400/10 border-slate-400/30", label: "Unknown" },
};

export default function PageGrid({ pages, selectedPages, onToggleSelect, onPageClick, activePage }: PageGridProps) {
  const [filterCategory, setFilterCategory] = useState<PageCategory | "all">("all");

  // Count categories
  const categoryCounts = pages.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const filtered = filterCategory === "all" ? pages : pages.filter((p) => p.category === filterCategory);

  return (
    <div>
      {/* Category filter bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All ({pages.length})
        </button>
        {Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([cat, count]) => {
            const config = CATEGORY_CONFIG[cat as PageCategory] || CATEGORY_CONFIG.unknown;
            const Icon = config.icon;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat as PageCategory)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filterCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Icon className="w-3 h-3" />
                {config.label} ({count})
              </button>
            );
          })}
      </div>

      {/* Thumbnail grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {filtered.map((page) => {
          const config = CATEGORY_CONFIG[page.category] || CATEGORY_CONFIG.unknown;
          const Icon = config.icon;
          const isSelected = selectedPages.has(page.index);
          const isActive = activePage === page.index;
          const hasSpecs = page.extractedSpecs && page.extractedSpecs.length > 0;

          return (
            <div
              key={page.index}
              className={`group relative rounded-lg border transition-all cursor-pointer ${
                isActive
                  ? "border-primary ring-2 ring-primary/30"
                  : isSelected
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              {/* Click to view detail */}
              <button
                onClick={() => onPageClick(page)}
                className="w-full text-left p-2"
              >
                {/* Page thumbnail placeholder */}
                <div className={`aspect-[8.5/11] rounded border ${config.color} flex flex-col items-center justify-center mb-2 relative overflow-hidden`}>
                  <Icon className="w-6 h-6 opacity-60" />
                  <span className="text-[10px] font-medium mt-1 opacity-80">{config.label}</span>

                  {/* Relevance bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                    <div
                      className={`h-full transition-all ${
                        page.relevance >= 70 ? "bg-emerald-500" : page.relevance >= 40 ? "bg-amber-500" : "bg-slate-400"
                      }`}
                      style={{ width: `${page.relevance}%` }}
                    />
                  </div>

                  {/* Vision badge */}
                  {page.visionAnalyzed && (
                    <div className="absolute top-1 right-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    </div>
                  )}

                  {/* Specs badge */}
                  {hasSpecs && (
                    <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[8px] font-bold px-1 rounded">
                      {page.extractedSpecs!.length} LED
                    </div>
                  )}
                </div>

                {/* Page number + relevance */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">pg {page.pageNumber}</span>
                  <span className={`text-[10px] font-medium ${
                    page.relevance >= 70 ? "text-emerald-500" : page.relevance >= 40 ? "text-amber-500" : "text-muted-foreground"
                  }`}>
                    {page.relevance}%
                  </span>
                </div>
              </button>

              {/* Selection toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(page.index);
                }}
                className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-border text-transparent group-hover:border-primary/50 group-hover:text-muted-foreground"
                }`}
              >
                {isSelected ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
