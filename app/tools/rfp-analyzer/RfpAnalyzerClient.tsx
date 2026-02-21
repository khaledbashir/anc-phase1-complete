"use client";

import React, { useState, useCallback } from "react";
import UploadZone from "./_components/UploadZone";
import SummaryCards from "./_components/SummaryCards";
import PageGrid from "./_components/PageGrid";
import PageDetail from "./_components/PageDetail";
import SpecsTable from "./_components/SpecsTable";
import type { RFPAnalysisResult, AnalyzedPage } from "@/services/rfp/unified/types";
import { RefreshCcw, ArrowRight, Monitor, FileDown } from "lucide-react";

export default function RfpAnalyzerClient() {
  // Upload + processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; percent: number; message: string } | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Results
  const [result, setResult] = useState<RFPAnalysisResult | null>(null);

  // Selection + navigation
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [activePage, setActivePage] = useState<AnalyzedPage | null>(null);

  // =========================================================================
  // Upload handler
  // =========================================================================

  const handleUpload = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setSelectedPages(new Set());
    setActivePage(null);
    setProgress({ stage: "uploading", percent: 5, message: "Uploading files..." });

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("file", f));

      const res = await fetch("/api/rfp/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `Analysis failed (${res.status})`);
      }

      const data: RFPAnalysisResult = await res.json();
      setResult(data);

      // Auto-select relevant pages (relevance >= 50)
      const autoSelect = new Set<number>();
      data.pages.forEach((p) => {
        if (p.relevance >= 50) autoSelect.add(p.index);
      });
      setSelectedPages(autoSelect);

      setProgress({ stage: "complete", percent: 100, message: "Analysis complete" });
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(err.message || "Unknown error during analysis");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // =========================================================================
  // Navigation
  // =========================================================================

  const handleReset = () => {
    setResult(null);
    setError(null);
    setSelectedPages(new Set());
    setActivePage(null);
    setProgress(undefined);
  };

  const toggleSelect = (pageIndex: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) next.delete(pageIndex);
      else next.add(pageIndex);
      return next;
    });
  };

  const handlePageClick = (page: AnalyzedPage) => {
    setActivePage(activePage?.index === page.index ? null : page);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (!result || !activePage) return;
    const currentIdx = result.pages.findIndex((p) => p.index === activePage.index);
    const nextIdx = direction === "prev" ? currentIdx - 1 : currentIdx + 1;
    if (nextIdx >= 0 && nextIdx < result.pages.length) {
      setActivePage(result.pages[nextIdx]);
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="flex-1 min-w-0 bg-background relative min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border py-4 px-6 xl:px-8">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">RFP Analyzer</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Mistral OCR + Gemini Vision — unified extraction pipeline
            </p>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" />
                  New Analysis
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 xl:px-8 max-w-[1600px] mx-auto">
        {/* Upload State */}
        {!result && !isProcessing && !error && (
          <UploadZone onUpload={handleUpload} isLoading={false} />
        )}

        {/* Processing State */}
        {isProcessing && (
          <UploadZone onUpload={() => {}} isLoading={true} progress={progress} />
        )}

        {/* Error State */}
        {error && !isProcessing && (
          <div className="mt-8 p-6 max-w-2xl mx-auto text-center border border-destructive/20 bg-destructive/10 rounded-xl">
            <h3 className="text-lg font-semibold text-destructive mb-2">Analysis Failed</h3>
            <p className="text-sm text-destructive/80 mb-4">{error}</p>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {result && !isProcessing && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-8">
            {/* Summary */}
            <SummaryCards
              stats={result.stats}
              files={result.files}
              selectedCount={selectedPages.size}
            />

            {/* Project info (if extracted) */}
            {result.project.clientName && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Project Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {result.project.clientName && (
                    <div>
                      <span className="text-muted-foreground">Client:</span>{" "}
                      <span className="font-medium">{result.project.clientName}</span>
                    </div>
                  )}
                  {result.project.venue && (
                    <div>
                      <span className="text-muted-foreground">Venue:</span>{" "}
                      <span className="font-medium">{result.project.venue}</span>
                    </div>
                  )}
                  {result.project.projectName && (
                    <div>
                      <span className="text-muted-foreground">Project:</span>{" "}
                      <span className="font-medium">{result.project.projectName}</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    {result.project.isOutdoor && (
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-full">Outdoor</span>
                    )}
                    {result.project.isUnionLabor && (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-xs font-medium rounded-full">Union</span>
                    )}
                    {result.project.bondRequired && (
                      <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs font-medium rounded-full">Bond</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LED Specs Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-primary" />
                  Extracted LED Displays ({result.screens.length})
                </h3>
              </div>
              <SpecsTable specs={result.screens} />
            </div>

            {/* Page Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Page Analysis ({result.pages.length} pages)
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{selectedPages.size} selected</span>
                  <button
                    onClick={() => {
                      const allIdxs = result.pages.filter((p) => p.relevance >= 50).map((p) => p.index);
                      setSelectedPages(new Set(allIdxs));
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Select relevant
                  </button>
                  <button
                    onClick={() => setSelectedPages(new Set(result.pages.map((p) => p.index)))}
                    className="text-xs text-primary hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setSelectedPages(new Set())}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <PageGrid
                pages={result.pages}
                selectedPages={selectedPages}
                onToggleSelect={toggleSelect}
                onPageClick={handlePageClick}
                activePage={activePage?.index ?? null}
              />
            </div>

            {/* Detail panel */}
            {activePage && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <PageDetail
                  page={activePage}
                  onClose={() => setActivePage(null)}
                  onNavigate={handleNavigate}
                  isSelected={selectedPages.has(activePage.index)}
                  onToggleSelect={() => toggleSelect(activePage.index)}
                  totalPages={result.pages.length}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
