"use client";

import React, { useState, useCallback, useRef } from "react";
import UploadZone, { type PipelineEvent } from "./_components/UploadZone";
import SummaryCards from "./_components/SummaryCards";
import PageGrid from "./_components/PageGrid";
import PageDetail from "./_components/PageDetail";
import SpecsTable from "./_components/SpecsTable";
import type { RFPAnalysisResult, AnalyzedPage } from "@/services/rfp/unified/types";
import { RefreshCcw, Monitor } from "lucide-react";

export default function RfpAnalyzerClient() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RFPAnalysisResult | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [activePage, setActivePage] = useState<AnalyzedPage | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // =========================================================================
  // SSE Upload + Pipeline
  // =========================================================================

  const handleUpload = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setSelectedPages(new Set());
    setActivePage(null);
    setEvents([]);

    abortRef.current = new AbortController();

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("file", f));

      const response = await fetch("/api/rfp/analyze", {
        method: "POST",
        body: formData,
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg: string;
        try { errMsg = JSON.parse(errText).error || errText; } catch { errMsg = errText; }
        throw new Error(errMsg);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: PipelineEvent = JSON.parse(line.slice(6));
              setEvents((prev) => [...prev, event]);

              if (event.type === "complete" && event.result) {
                const data = event.result as RFPAnalysisResult;
                setResult(data);
                const autoSelect = new Set<number>();
                data.pages.forEach((p) => { if (p.relevance >= 50) autoSelect.add(p.index); });
                setSelectedPages(autoSelect);
              }

              if (event.type === "error") {
                setError(event.message || "Pipeline error");
              }
            } catch {
              // Ignore parse errors in stream
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Analysis error:", err);
        setError(err.message || "Unknown error");
      }
    } finally {
      setIsProcessing(false);
      abortRef.current = null;
    }
  }, []);

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort();
    setResult(null);
    setError(null);
    setSelectedPages(new Set());
    setActivePage(null);
    setEvents([]);
    setIsProcessing(false);
  };

  const toggleSelect = (pageIndex: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) next.delete(pageIndex); else next.add(pageIndex);
      return next;
    });
  };

  const handlePageClick = (page: AnalyzedPage) => {
    setActivePage(activePage?.index === page.index ? null : page);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (!result || !activePage) return;
    const idx = result.pages.findIndex((p) => p.index === activePage.index);
    const next = direction === "prev" ? idx - 1 : idx + 1;
    if (next >= 0 && next < result.pages.length) setActivePage(result.pages[next]);
  };

  return (
    <div className="flex-1 min-w-0 bg-background relative min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border py-4 px-6 xl:px-8">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">RFP Analyzer</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Kreuzberg OCR + Mistral Vision — unified extraction pipeline
            </p>
          </div>
          {(result || isProcessing) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              {isProcessing ? "Cancel" : "New Analysis"}
            </button>
          )}
        </div>
      </header>

      <main className="p-6 xl:px-8 max-w-[1600px] mx-auto">
        {(!result || isProcessing) && !error && (
          <UploadZone onUpload={handleUpload} isLoading={isProcessing} events={events} />
        )}

        {error && !isProcessing && (
          <div className="mt-8 p-6 max-w-2xl mx-auto text-center border border-destructive/20 bg-destructive/10 rounded-xl">
            <h3 className="text-lg font-semibold text-destructive mb-2">Analysis Failed</h3>
            <p className="text-sm text-destructive/80 mb-4">{error}</p>
            <button onClick={handleReset} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted">
              Try Again
            </button>
          </div>
        )}

        {result && !isProcessing && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-8">
            <SummaryCards stats={result.stats} files={result.files} selectedCount={selectedPages.size} />

            {result.project.clientName && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Project Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {result.project.clientName && <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{result.project.clientName}</span></div>}
                  {result.project.venue && <div><span className="text-muted-foreground">Venue:</span> <span className="font-medium">{result.project.venue}</span></div>}
                  {result.project.projectName && <div><span className="text-muted-foreground">Project:</span> <span className="font-medium">{result.project.projectName}</span></div>}
                  <div className="flex gap-3">
                    {result.project.isOutdoor && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-full">Outdoor</span>}
                    {result.project.isUnionLabor && <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-xs font-medium rounded-full">Union</span>}
                    {result.project.bondRequired && <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs font-medium rounded-full">Bond</span>}
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-primary" />
                  Extracted LED Displays ({result.screens.length})
                </h3>
              </div>
              <SpecsTable specs={result.screens} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Page Analysis ({result.pages.length} pages)</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{selectedPages.size} selected</span>
                  <button onClick={() => setSelectedPages(new Set(result.pages.filter((p) => p.relevance >= 50).map((p) => p.index)))} className="text-xs text-primary hover:underline">Select relevant</button>
                  <button onClick={() => setSelectedPages(new Set(result.pages.map((p) => p.index)))} className="text-xs text-primary hover:underline">All</button>
                  <button onClick={() => setSelectedPages(new Set())} className="text-xs text-primary hover:underline">Clear</button>
                </div>
              </div>
              <PageGrid pages={result.pages} selectedPages={selectedPages} onToggleSelect={toggleSelect} onPageClick={handlePageClick} activePage={activePage?.index ?? null} />
            </div>

            {activePage && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <PageDetail page={activePage} onClose={() => setActivePage(null)} onNavigate={handleNavigate} isSelected={selectedPages.has(activePage.index)} onToggleSelect={() => toggleSelect(activePage.index)} totalPages={result.pages.length} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
