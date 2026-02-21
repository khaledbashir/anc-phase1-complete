"use client";

import React from "react";
import type { RFPAnalysisResult } from "@/services/rfp/unified/types";
import { FileText, Monitor, PenTool, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

interface SummaryCardsProps {
  stats: RFPAnalysisResult["stats"];
  files: RFPAnalysisResult["files"];
  selectedCount: number;
}

export default function SummaryCards({ stats, files, selectedCount }: SummaryCardsProps) {
  const cards = [
    {
      label: "Total Pages",
      value: stats.totalPages,
      sub: files.map((f) => f.filename).join(", "),
      icon: FileText,
      color: "text-foreground",
    },
    {
      label: "Relevant Pages",
      value: stats.relevantPages,
      sub: `${Math.round((stats.relevantPages / Math.max(stats.totalPages, 1)) * 100)}% of total`,
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    {
      label: "Drawing Pages",
      value: stats.drawingPages,
      sub: stats.geminiPagesProcessed > 0 ? `${stats.geminiPagesProcessed} analyzed by Gemini` : "Pending vision analysis",
      icon: PenTool,
      color: "text-blue-500",
    },
    {
      label: "LED Displays Found",
      value: stats.specsFound,
      sub: stats.extractionAccuracy,
      icon: Monitor,
      color: "text-amber-500",
    },
    {
      label: "Processing Time",
      value: `${(stats.processingTimeMs / 1000).toFixed(1)}s`,
      sub: `${stats.mistralPagesProcessed} Mistral + ${stats.geminiPagesProcessed} Gemini`,
      icon: Clock,
      color: "text-muted-foreground",
    },
    {
      label: "Selected",
      value: selectedCount,
      sub: "pages for proposal",
      icon: selectedCount > 0 ? CheckCircle2 : AlertTriangle,
      color: selectedCount > 0 ? "text-primary" : "text-amber-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
