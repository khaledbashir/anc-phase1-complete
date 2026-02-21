"use client";

import React from "react";
import type { AnalyzedPage } from "@/services/rfp/unified/types";
import {
  X,
  Sparkles,
  Monitor,
  MapPin,
  Maximize2,
  Hash,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PageDetailProps {
  page: AnalyzedPage;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  totalPages: number;
}

export default function PageDetail({
  page,
  onClose,
  onNavigate,
  isSelected,
  onToggleSelect,
  totalPages,
}: PageDetailProps) {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigate("prev")}
              disabled={page.pageNumber <= 1}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">
              Page {page.pageNumber} of {totalPages}
            </span>
            <button
              onClick={() => onNavigate("next")}
              disabled={page.pageNumber >= totalPages}
              className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            page.relevance >= 70
              ? "bg-emerald-500/10 text-emerald-500"
              : page.relevance >= 40
                ? "bg-amber-500/10 text-amber-500"
                : "bg-muted text-muted-foreground"
          }`}>
            {page.relevance}% relevance
          </span>

          {page.visionAnalyzed && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-400/10 text-amber-500">
              <Sparkles className="w-3 h-3" /> Gemini analyzed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSelect}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {isSelected ? "Included" : "Excluded"}
          </button>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content — split view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Left: Page content (markdown) */}
        <div className="p-4 max-h-[600px] overflow-y-auto">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Extracted Content
          </h4>
          {page.markdown.trim() ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed font-sans">
                {page.markdown}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No text content — this appears to be a drawing or diagram.
            </p>
          )}

          {/* Tables */}
          {page.tables.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Tables ({page.tables.length})
              </h4>
              {page.tables.map((table, i) => (
                <div
                  key={table.id || i}
                  className="border border-border rounded-lg overflow-x-auto mb-2 text-xs"
                  dangerouslySetInnerHTML={{ __html: table.content }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Analysis + Extracted Specs */}
        <div className="p-4 max-h-[600px] overflow-y-auto">
          {/* Summary */}
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Analysis
          </h4>
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium capitalize">{page.category.replace(/_/g, " ")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Classified by:</span>
              <span className="font-medium">{page.classifiedBy}</span>
            </div>
            <p className="text-sm text-foreground">{page.summary}</p>

            {page.visionSummary && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-500">Gemini Vision</span>
                </div>
                <p className="text-sm text-foreground">{page.visionSummary}</p>
              </div>
            )}
          </div>

          {/* Extracted LED Specs */}
          {page.extractedSpecs && page.extractedSpecs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                LED Displays Found ({page.extractedSpecs.length})
              </h4>
              <div className="space-y-3">
                {page.extractedSpecs.map((spec, i) => (
                  <div key={i} className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-foreground">{spec.name}</span>
                      <span className="text-xs text-emerald-500 font-medium">
                        {Math.round(spec.confidence * 100)}% confidence
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      {spec.location && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {spec.location}
                        </div>
                      )}
                      {(spec.widthFt || spec.heightFt) && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Maximize2 className="w-3 h-3" /> {spec.widthFt}&apos; x {spec.heightFt}&apos;
                        </div>
                      )}
                      {spec.pixelPitchMm && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Hash className="w-3 h-3" /> {spec.pixelPitchMm}mm pitch
                        </div>
                      )}
                      {spec.brightnessNits && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Sun className="w-3 h-3" /> {spec.brightnessNits} nits
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Monitor className="w-3 h-3" /> {spec.environment} x{spec.quantity}
                      </div>
                    </div>
                    {spec.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{spec.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
