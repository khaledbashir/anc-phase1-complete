"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import UploadZone, { type PipelineEvent } from "./_components/UploadZone";
import SpecsTable from "./_components/SpecsTable";
import RequirementsTable from "./_components/RequirementsTable";
import type { ExtractedLEDSpec, ExtractedRequirement } from "@/services/rfp/unified/types";
import {
  RefreshCcw,
  Monitor,
  FileText,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  Zap,
  Download,
  Upload,
  DollarSign,
  FileSpreadsheet,
  AlertTriangle,
  Shield,
  Calendar,
  Loader2,
  History,
  MessageSquare,
  ImageIcon,
} from "lucide-react";

// ==========================================================================
// Types
// ==========================================================================

interface AnalysisResult {
  id: string | null;
  screens: ExtractedLEDSpec[];
  requirements?: ExtractedRequirement[];
  aiWorkspaceSlug?: string | null;
  project: {
    clientName: string | null;
    projectName: string | null;
    venue: string | null;
    location: string | null;
    isOutdoor: boolean;
    isUnionLabor: boolean;
    bondRequired: boolean;
    specialRequirements: string[];
  };
  stats: {
    totalPages: number;
    relevantPages: number;
    noisePages: number;
    drawingPages: number;
    specsFound: number;
    processingTimeMs: number;
  };
  triage: Array<{
    pageNumber: number;
    category: string;
    relevance: number;
    isDrawing: boolean;
  }>;
}

interface PricingPreview {
  displays: Array<{
    name: string;
    pixelPitch: number | null;
    areaSqFt: number;
    quantity: number;
    hardwareCost: number;
    totalCost: number;
    totalSellingPrice: number;
    blendedMarginPct: number;
    costSource: string;
    matchedProduct: { manufacturer: string; model: string; fitScore: number } | null;
  }>;
  summary: {
    totalCost: number;
    totalSellingPrice: number;
    totalMargin: number;
    blendedMarginPct: number;
    displayCount: number;
    quotedCount: number;
    rateCardCount: number;
  };
}

type Phase = "upload" | "processing" | "results";

// ==========================================================================
// Main Component
// ==========================================================================

export default function RfpAnalyzerClient() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ filename: string; pageCount: number; sizeMb: string } | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Pipeline step states
  const [downloading, setDownloading] = useState<string | null>(null);
  const [quoteImportResult, setQuoteImportResult] = useState<any>(null);
  const [pricingPreview, setPricingPreview] = useState<PricingPreview | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [resultsTab, setResultsTab] = useState<"extraction" | "pricing">("extraction");
  const [drawingUpload, setDrawingUpload] = useState<{ uploading: boolean; results: Array<{ filename: string; pages: number }> }>({ uploading: false, results: [] });
  const [quotePreviewOpen, setQuotePreviewOpen] = useState(false);
  const [editableSpecs, setEditableSpecs] = useState<ExtractedLEDSpec[]>([]);

  // ========================================================================
  // Auto-run pricing when extraction completes (no manual step needed)
  // ========================================================================

  useEffect(() => {
    if (result?.id && result.screens.length > 0 && !pricingPreview && !loadingPricing) {
      autoPreviewPricing([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id]);

  // ========================================================================
  // Upload → auto-pipeline (one SSE stream, fully automatic)
  // ========================================================================

  const handleUpload = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setPhase("processing");
    setError(null);
    setEvents([]);
    setResult(null);
    setQuoteImportResult(null);
    setPricingPreview(null);

    try {
      const CHUNK_SIZE = 10 * 1024 * 1024;
      const sizeMbStr = (file.size / 1024 / 1024).toFixed(0);
      const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

      abortRef.current = new AbortController();
      let sessionId = "";
      let lastJson: any = null;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const pct = Math.round(((i + 1) / totalChunks) * 100);

        setEvents([{
          type: "stage",
          stage: "uploading",
          message: `Uploading ${file.name} (${sizeMbStr}MB) — ${pct}%`,
        }]);

        const res = await fetch("/api/rfp/analyze/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-Filename": file.name,
            "X-Session-Id": sessionId || "",
            "X-Chunk-Index": String(i),
            "X-Total-Chunks": String(totalChunks),
          },
          body: chunk,
          credentials: "omit",
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          let msg = `Upload failed at chunk ${i + 1}/${totalChunks} (${res.status})`;
          try { msg = JSON.parse(errText)?.error || msg; } catch {}
          throw new Error(msg);
        }

        lastJson = await res.json();
        if (!sessionId) sessionId = lastJson.sessionId;
      }

      const uploadRes = lastJson as { sessionId: string; filename: string; pageCount: number; sizeMb: string };
      setFileInfo({ filename: uploadRes.filename, pageCount: uploadRes.pageCount, sizeMb: uploadRes.sizeMb });
      setEvents([{ type: "stage", stage: "uploaded", message: `Uploaded: ${uploadRes.pageCount.toLocaleString()} pages, ${uploadRes.sizeMb}MB` }]);

      const response = await fetch("/api/rfp/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: uploadRes.sessionId, filename: uploadRes.filename }),
        credentials: "omit",
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        try { throw new Error(JSON.parse(errBody)?.error || `Pipeline failed (${response.status})`); }
        catch { throw new Error(`Pipeline failed (${response.status})`); }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: PipelineEvent = JSON.parse(line.slice(6));
            setEvents((prev) => [...prev, event]);

            if (event.type === "complete" && event.result) {
              setResult(event.result);
              setPhase("results");
            }

            if (event.type === "error") {
              throw new Error(event.message || "Pipeline failed");
            }
          } catch (e: any) {
            if (e.message?.includes("failed") || e.message?.includes("Pipeline")) throw e;
          }
        }
      }

      if (phase !== "results" && !result) {
        const lastErr = events.find((e) => e.type === "error");
        if (lastErr) throw new Error(lastErr.message || "Pipeline failed");
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Pipeline error:", err);
      setError(err.message || "Unknown error");
      setPhase("upload");
    }
  }, []);

  // ========================================================================
  // Quote Preview: open editable preview before downloading
  // ========================================================================

  const openQuotePreview = () => {
    if (!result) return;
    setEditableSpecs(result.screens.map((s) => ({ ...s })));
    setQuotePreviewOpen(true);
    setResultsTab("pricing");
  };

  const updateEditableSpec = (index: number, field: keyof ExtractedLEDSpec, value: any) => {
    setEditableSpecs((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeEditableSpec = (index: number) => {
    setEditableSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  // ========================================================================
  // Download Subcontractor Excel (uses edited specs if preview was open)
  // ========================================================================

  const handleDownloadSubcontractorExcel = async () => {
    if (!result?.id) return;
    setDownloading("subcontractor");
    try {
      const specsToSend = quotePreviewOpen && editableSpecs.length > 0 ? editableSpecs : undefined;
      const res = await fetch("/api/rfp/pipeline/subcontractor-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: result.id, specs: specsToSend }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "Quote_Request.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      setQuotePreviewOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  // ========================================================================
  // Pipeline Step 5: Import Quote Excel
  // ========================================================================

  const handleImportQuote = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !result?.id) return;
    setDownloading("importing");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("analysisId", result.id);
      const res = await fetch("/api/rfp/pipeline/import-quote", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Import failed (${res.status})`);
      const data = await res.json();
      setQuoteImportResult(data);
      // Auto-trigger pricing preview after import + switch to Pricing tab
      setResultsTab("pricing");
      autoPreviewPricing(data.quotes || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
      e.target.value = "";
    }
  };

  // ========================================================================
  // Pipeline Step 6: Preview Pricing / Download Rate Card
  // ========================================================================

  const handlePreviewPricing = async () => {
    if (!result?.id) return;
    setLoadingPricing(true);
    try {
      const res = await fetch("/api/rfp/pipeline/pricing-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: result.id,
          quotes: quoteImportResult?.quotes || [],
          includeBond: result.project.bondRequired,
        }),
      });
      if (!res.ok) throw new Error(`Pricing failed (${res.status})`);
      const data = await res.json();
      setPricingPreview(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingPricing(false);
    }
  };

  // Auto-trigger pricing after quote import (accepts quotes directly so we don't depend on stale state)
  const autoPreviewPricing = async (quotes: any[]) => {
    if (!result?.id) return;
    setLoadingPricing(true);
    try {
      const res = await fetch("/api/rfp/pipeline/pricing-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: result.id,
          quotes,
          includeBond: result.project.bondRequired,
        }),
      });
      if (!res.ok) throw new Error(`Pricing failed (${res.status})`);
      const data = await res.json();
      setPricingPreview(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleDownloadRateCard = async () => {
    if (!result?.id) return;
    setDownloading("ratecard");
    try {
      const res = await fetch("/api/rfp/pipeline/rate-card-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: result.id,
          quotes: quoteImportResult?.quotes || [],
          includeBond: result.project.bondRequired,
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "Rate_Card.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  // ========================================================================
  // Excel Export (extraction results)
  // ========================================================================

  const handleExportExcel = async () => {
    if (!result?.id) return;
    setDownloading("extraction");
    try {
      const res = await fetch("/api/rfp/pipeline/extraction-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: result.id }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "Extraction.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  // ========================================================================
  // Reset
  // ========================================================================

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort();
    setPhase("upload");
    setError(null);
    setEvents([]);
    setFileInfo(null);
    setResult(null);
    setQuoteImportResult(null);
    setPricingPreview(null);
    setResultsTab("extraction");
    setDrawingUpload({ uploading: false, results: [] });
    setQuotePreviewOpen(false);
    setEditableSpecs([]);
  };

  // ========================================================================
  // Upload supplementary drawings
  // ========================================================================

  const handleUploadDrawings = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !result?.id) return;
    setDrawingUpload((prev) => ({ ...prev, uploading: true }));

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("analysisId", result.id);
        const res = await fetch("/api/rfp/analyze/drawings", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = await res.json();
        setDrawingUpload((prev) => ({
          ...prev,
          results: [...prev.results, { filename: data.filename, pages: data.pagesProcessed }],
        }));
      } catch (err: any) {
        setError(`Drawing upload failed: ${err.message}`);
      }
    }

    setDrawingUpload((prev) => ({ ...prev, uploading: false }));
    e.target.value = "";
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="flex-1 min-w-0 bg-background relative min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border py-4 px-6 xl:px-8">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">RFP Analyzer</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {fileInfo
                ? `${fileInfo.filename} — ${fileInfo.pageCount.toLocaleString()} pages, ${fileInfo.sizeMb}MB`
                : "Upload an RFP PDF — we handle the rest"
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/tools/rfp-analyzer/history"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            >
              <History className="w-4 h-4" />
              History
            </Link>
            {phase !== "upload" && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                {phase === "processing" ? "Cancel" : "New Analysis"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 xl:px-8 max-w-[1600px] mx-auto">
        {/* ============ UPLOAD / PROCESSING ============ */}
        {(phase === "upload" || phase === "processing") && (
          <>
            <UploadZone
              onUpload={handleUpload}
              isLoading={phase === "processing"}
              events={events}
            />
            {error && phase === "upload" && (
              <div className="mt-6 p-5 max-w-2xl mx-auto text-center border border-destructive/20 bg-destructive/10 rounded-xl">
                <p className="text-sm text-destructive font-medium mb-3">{error}</p>
                <button onClick={handleReset} className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted">
                  Try Again
                </button>
              </div>
            )}
          </>
        )}

        {/* ============ RESULTS ============ */}
        {phase === "results" && result && (() => {
          const requirements = result.requirements || [];
          const criticalReqs = requirements.filter((r) => r.status === "critical").length;

          return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-6">
            {/* Error banner */}
            {error && (
              <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-xl">
                <p className="text-sm text-destructive">{error}</p>
                <button onClick={() => setError(null)} className="text-xs text-destructive/60 hover:text-destructive mt-1">Dismiss</button>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <StatCard icon={FileText} label="Total Pages" value={result.stats.totalPages.toLocaleString()} />
              <StatCard
                icon={CheckCircle2}
                label="Relevant Pages"
                value={result.stats.relevantPages.toString()}
                sub={`${Math.round((result.stats.relevantPages / result.stats.totalPages) * 100)}% kept`}
                accent="text-emerald-500"
              />
              <StatCard icon={FileText} label="Noise Filtered" value={result.stats.noisePages.toString()} sub="auto-removed" />
              <StatCard icon={Monitor} label="LED Displays" value={result.stats.specsFound.toString()} accent="text-primary" />
              <StatCard
                icon={AlertTriangle}
                label="Requirements"
                value={requirements.length.toString()}
                sub={criticalReqs > 0 ? `${criticalReqs} critical` : undefined}
                accent={criticalReqs > 0 ? "text-red-500" : undefined}
              />
              <StatCard icon={Clock} label="Processing Time" value={`${(result.stats.processingTimeMs / 1000).toFixed(1)}s`} />
            </div>

            {/* Project info */}
            {(result.project.clientName || result.project.venue || result.project.projectName) && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Project Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {result.project.clientName && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Client</span>
                      <span className="font-medium">{result.project.clientName}</span>
                    </div>
                  )}
                  {result.project.projectName && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Project</span>
                      <span className="font-medium">{result.project.projectName}</span>
                    </div>
                  )}
                  {result.project.venue && (
                    <div>
                      <span className="text-xs text-muted-foreground block">Venue</span>
                      <span className="font-medium">{result.project.venue}</span>
                    </div>
                  )}
                  {result.project.location && (
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs text-muted-foreground block">Location</span>
                        <span className="font-medium">{result.project.location}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {result.project.isOutdoor && <Flag label="Outdoor" />}
                  {result.project.isUnionLabor && <Flag label="Union Labor" />}
                  {result.project.bondRequired && <Flag label="Bond Required" />}
                  {result.project.specialRequirements.map((r) => <Flag key={r} label={r} />)}
                </div>
              </div>
            )}

            {/* ============ TABBED VIEW: Extraction | Pricing ============ */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-border overflow-hidden shadow-sm">
              {/* Excel-style title bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#217346] text-white text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="font-medium truncate max-w-[400px]">
                    {result.project.projectName || result.project.venue || fileInfo?.filename || "RFP Analysis"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {result.aiWorkspaceSlug && (
                    <Link
                      href={`/chat?workspace=${result.aiWorkspaceSlug}`}
                      target="_blank"
                      className="flex items-center gap-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] font-medium transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Verify with AI
                    </Link>
                  )}
                  <button
                    onClick={handleDownloadRateCard}
                    disabled={downloading === "ratecard" || !result?.id}
                    className="flex items-center gap-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                  >
                    {downloading === "ratecard" ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                    Download Pricing
                  </button>
                  <button
                    onClick={handleExportExcel}
                    disabled={downloading === "extraction"}
                    className="flex items-center gap-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                  >
                    {downloading === "extraction" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Export .xlsx
                  </button>
                </div>
              </div>

              {/* Tab content area */}
              <div className="min-h-[400px]">
                {resultsTab === "extraction" && (
                  <div className="p-5 space-y-6">
                    {/* Pricing summary banner (auto-generated) */}
                    {pricingPreview && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <DollarSign className="w-5 h-5 text-emerald-600" />
                            <div>
                              <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                Estimated Total: {fmtUsd(pricingPreview.summary.totalSellingPrice)}
                              </span>
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-3">
                                {pricingPreview.summary.displayCount} displays | {pricingPreview.summary.blendedMarginPct}% margin | Cost: {fmtUsd(pricingPreview.summary.totalCost)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setResultsTab("pricing")}
                            className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                          >
                            View full pricing breakdown &rarr;
                          </button>
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2">
                          Auto-estimated from rate cards. Send to supplier for exact quotes, or download pricing Excel now.
                        </p>
                      </div>
                    )}
                    {loadingPricing && !pricingPreview && (
                      <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Calculating estimated pricing from rate cards...</span>
                      </div>
                    )}

                    {/* LED specs table */}
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-primary" />
                        Extracted LED Displays ({result.screens.length})
                      </h3>
                      <SpecsTable specs={result.screens} />
                    </div>

                    {/* Requirements table */}
                    {requirements.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-amber-500" />
                          Requirements & Key Points ({requirements.length})
                          {criticalReqs > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full">
                              {criticalReqs} critical
                            </span>
                          )}
                        </h3>
                        <RequirementsTable requirements={requirements} />
                      </div>
                    )}

                    {/* Triage minimap */}
                    {result.triage.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3">
                          Page Triage Map ({result.triage.length} pages)
                        </h3>
                        <TriageMinimap triage={result.triage} />
                      </div>
                    )}

                    {/* Upload supplementary drawings */}
                    {result.id && (
                      <div className="border border-dashed border-border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <span className="text-sm font-medium">Supplementary Drawings</span>
                              <p className="text-xs text-muted-foreground">Upload separate drawing/spec files (PDF, PNG, JPG) — max 20 pages each</p>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0">
                            {drawingUpload.uploading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                            {drawingUpload.uploading ? "Processing..." : "Upload Drawings"}
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
                              multiple
                              onChange={handleUploadDrawings}
                              disabled={drawingUpload.uploading}
                              className="hidden"
                            />
                          </label>
                        </div>
                        {drawingUpload.results.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {drawingUpload.results.map((r, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>{r.filename} — {r.pages} page(s) processed</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {resultsTab === "pricing" && (
                  <div className="p-5 space-y-6">
                    {/* Workflow Steps */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Step 1: Send to Supplier */}
                      <PipelineStep
                        step={1}
                        title="Send to Supplier"
                        description={quotePreviewOpen ? "Review specs below, then download" : "Review & download Excel for quoting"}
                        icon={FileSpreadsheet}
                        status={quotePreviewOpen ? "done" : "ready"}
                        action={
                          quotePreviewOpen ? (
                            <button
                              onClick={handleDownloadSubcontractorExcel}
                              disabled={downloading === "subcontractor" || editableSpecs.length === 0}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              {downloading === "subcontractor" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                              Download ({editableSpecs.length} displays)
                            </button>
                          ) : (
                            <button
                              onClick={openQuotePreview}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                              Review & Download
                            </button>
                          )
                        }
                      />

                      {/* Step 2: Import Response */}
                      <PipelineStep
                        step={2}
                        title="Import Supplier Response"
                        description={quoteImportResult
                          ? `${quoteImportResult.quotedCount}/${quoteImportResult.quotes.length} displays quoted`
                          : "Upload their completed Excel back"
                        }
                        icon={Upload}
                        status={quoteImportResult ? "done" : "ready"}
                        action={
                          <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-medium cursor-pointer transition-colors">
                            {downloading === "importing" ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : quoteImportResult ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            {quoteImportResult ? "Re-import" : "Upload Supplier Excel"}
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={handleImportQuote}
                              className="hidden"
                            />
                          </label>
                        }
                      />

                      {/* Step 3: Final Pricing */}
                      <PipelineStep
                        step={3}
                        title="Final Pricing"
                        description={pricingPreview ? "Pricing ready — download below" : "Auto-generated from rate cards"}
                        icon={DollarSign}
                        status={pricingPreview ? "done" : "ready"}
                        action={
                          <div className="space-y-2">
                            <button
                              onClick={handlePreviewPricing}
                              disabled={loadingPricing}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                            >
                              {loadingPricing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <DollarSign className="w-4 h-4" />
                              )}
                              {pricingPreview ? "Refresh Pricing" : "Preview Pricing"}
                            </button>
                            <button
                              onClick={handleDownloadRateCard}
                              disabled={downloading === "ratecard"}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {downloading === "ratecard" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                              Download Pricing Excel
                            </button>
                          </div>
                        }
                      />
                    </div>

                    {/* Editable quote preview */}
                    {quotePreviewOpen && editableSpecs.length > 0 && (
                      <div className="border border-primary/20 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-primary/10">
                          <span className="text-sm font-semibold text-primary">
                            Review Quote Request ({editableSpecs.length} displays)
                          </span>
                          <button
                            onClick={() => setQuotePreviewOpen(false)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Close preview
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-zinc-100 dark:bg-zinc-800">
                                <th className="text-left px-3 py-2 font-semibold border-b border-border w-[200px]">Display Name</th>
                                <th className="text-left px-3 py-2 font-semibold border-b border-border w-[160px]">Location</th>
                                <th className="text-right px-3 py-2 font-semibold border-b border-border w-[70px]">W (ft)</th>
                                <th className="text-right px-3 py-2 font-semibold border-b border-border w-[70px]">H (ft)</th>
                                <th className="text-right px-3 py-2 font-semibold border-b border-border w-[70px]">Pitch</th>
                                <th className="text-center px-3 py-2 font-semibold border-b border-border w-[50px]">Qty</th>
                                <th className="text-left px-3 py-2 font-semibold border-b border-border">Notes for Supplier</th>
                                <th className="text-center px-3 py-2 font-semibold border-b border-border w-[40px]"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {editableSpecs.map((spec, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                  <td className="px-1 py-1 border-b border-border">
                                    <input
                                      type="text"
                                      value={spec.name}
                                      onChange={(e) => updateEditableSpec(idx, "name", e.target.value)}
                                      className="w-full px-2 py-1 text-xs bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded"
                                    />
                                  </td>
                                  <td className="px-1 py-1 border-b border-border">
                                    <input
                                      type="text"
                                      value={spec.location}
                                      onChange={(e) => updateEditableSpec(idx, "location", e.target.value)}
                                      className="w-full px-2 py-1 text-xs bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded"
                                    />
                                  </td>
                                  <td className="px-1 py-1 border-b border-border">
                                    <input
                                      type="number"
                                      value={spec.widthFt ?? ""}
                                      onChange={(e) => updateEditableSpec(idx, "widthFt", e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-full px-2 py-1 text-xs text-right bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded font-mono"
                                    />
                                  </td>
                                  <td className="px-1 py-1 border-b border-border">
                                    <input
                                      type="number"
                                      value={spec.heightFt ?? ""}
                                      onChange={(e) => updateEditableSpec(idx, "heightFt", e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-full px-2 py-1 text-xs text-right bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded font-mono"
                                    />
                                  </td>
                                  <td className="px-1 py-1 border-b border-border">
                                    <input
                                      type="number"
                                      value={spec.pixelPitchMm ?? ""}
                                      onChange={(e) => updateEditableSpec(idx, "pixelPitchMm", e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-full px-2 py-1 text-xs text-right bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded font-mono"
                                    />
                                  </td>
                                  <td className="px-1 py-1 border-b border-border">
                                    <input
                                      type="number"
                                      value={spec.quantity}
                                      onChange={(e) => updateEditableSpec(idx, "quantity", parseInt(e.target.value) || 1)}
                                      className="w-full px-2 py-1 text-xs text-center bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded font-mono"
                                      min={1}
                                    />
                                  </td>
                                  <td className="px-1 py-1 border-b border-border">
                                    <input
                                      type="text"
                                      value={spec.notes ?? ""}
                                      onChange={(e) => updateEditableSpec(idx, "notes", e.target.value || null)}
                                      placeholder="Add note..."
                                      className="w-full px-2 py-1 text-xs bg-transparent border border-transparent hover:border-border focus:border-primary focus:outline-none rounded text-muted-foreground placeholder:text-muted-foreground/50"
                                    />
                                  </td>
                                  <td className="px-1 py-1 border-b border-border text-center">
                                    <button
                                      onClick={() => removeEditableSpec(idx)}
                                      className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                      title="Remove from quote"
                                    >
                                      &times;
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {editableSpecs.length === 0 && (
                          <div className="p-6 text-center text-muted-foreground text-sm">
                            All displays removed. Close preview to reset.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quote import result */}
                    {quoteImportResult && (
                      <div className="bg-muted/50 rounded-lg p-4 text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="font-medium">Quote Imported: {quoteImportResult.filename}</span>
                        </div>
                        <div className="flex gap-4 text-muted-foreground">
                          <span>{quoteImportResult.quotedCount} quoted</span>
                          <span>{quoteImportResult.missingCount} missing</span>
                        </div>
                        {quoteImportResult.warnings?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {quoteImportResult.warnings.map((w: string, i: number) => (
                              <div key={i} className="flex items-start gap-1.5 text-amber-600">
                                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                <span className="text-xs">{w}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Loading state */}
                    {loadingPricing && !pricingPreview && (
                      <div className="flex items-center justify-center py-12 text-muted-foreground gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Calculating pricing with rate card + quotes...</span>
                      </div>
                    )}

                    {/* Excel-style pricing table */}
                    {pricingPreview && (
                      <div className="space-y-4">
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-muted/50 rounded-lg p-3">
                            <span className="text-xs text-muted-foreground block">Total Cost</span>
                            <span className="text-lg font-bold font-mono">{fmtUsd(pricingPreview.summary.totalCost)}</span>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3">
                            <span className="text-xs text-muted-foreground block">Total Selling</span>
                            <span className="text-lg font-bold font-mono">{fmtUsd(pricingPreview.summary.totalSellingPrice)}</span>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                            <span className="text-xs text-muted-foreground block">Total Margin</span>
                            <span className="text-lg font-bold font-mono text-emerald-600">{fmtUsd(pricingPreview.summary.totalMargin)}</span>
                          </div>
                          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                            <span className="text-xs text-muted-foreground block">Blended Margin</span>
                            <span className="text-lg font-bold font-mono text-emerald-600">{pricingPreview.summary.blendedMarginPct}%</span>
                          </div>
                        </div>

                        {/* Excel-style table */}
                        <div className="border border-border rounded-lg overflow-hidden">
                          {/* Column letter header (Excel style) */}
                          <div className="flex border-b border-border bg-zinc-50 dark:bg-zinc-800">
                            <div className="w-8 shrink-0 border-r border-border" />
                            {["A", "B", "C", "D", "E", "F", "G"].map((letter) => (
                              <div key={letter} className="flex-1 min-w-[90px] px-2 py-0.5 text-center text-[10px] font-medium text-muted-foreground border-r border-border last:border-r-0">
                                {letter}
                              </div>
                            ))}
                          </div>

                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#0A52EF]/5 dark:bg-[#0A52EF]/10">
                                <th className="w-8 text-center text-[10px] text-muted-foreground border-r border-b border-border bg-zinc-50 dark:bg-zinc-800 font-normal">1</th>
                                <th className="text-left px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border">DISPLAY</th>
                                <th className="text-right px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border">AREA</th>
                                <th className="text-right px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border">HW COST</th>
                                <th className="text-right px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border">TOTAL COST</th>
                                <th className="text-right px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border">SELL PRICE</th>
                                <th className="text-center px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border">MARGIN %</th>
                                <th className="text-center px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-b border-border">SOURCE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pricingPreview.displays.map((d, i) => (
                                <tr key={i} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                  <td className="w-8 text-center text-[10px] text-muted-foreground border-r border-b border-border bg-zinc-50 dark:bg-zinc-800">
                                    {i + 2}
                                  </td>
                                  <td className="px-2 py-1.5 border-r border-b border-border">
                                    <span className="font-semibold">{d.name}</span>
                                    {d.matchedProduct && (
                                      <span className="block text-[10px] text-muted-foreground">
                                        {d.matchedProduct.manufacturer} {d.matchedProduct.model} ({d.matchedProduct.fitScore}% fit)
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-1.5 text-right font-mono border-r border-b border-border">{d.areaSqFt} sqft</td>
                                  <td className="px-2 py-1.5 text-right font-mono border-r border-b border-border">{fmtUsd(d.hardwareCost)}</td>
                                  <td className="px-2 py-1.5 text-right font-mono border-r border-b border-border">{fmtUsd(d.totalCost)}</td>
                                  <td className="px-2 py-1.5 text-right font-mono font-semibold border-r border-b border-border">{fmtUsd(d.totalSellingPrice)}</td>
                                  <td className="px-2 py-1.5 text-center border-r border-b border-border">
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                      d.blendedMarginPct >= 0.25 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                      d.blendedMarginPct >= 0.15 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    }`}>
                                      {(d.blendedMarginPct * 100).toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 text-center border-b border-border">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      d.costSource === "subcontractor_quote"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        : "bg-muted text-muted-foreground"
                                    }`}>
                                      {d.costSource === "subcontractor_quote" ? "Quote" : d.costSource === "rate_card" ? "Rate Card" : "Match"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {/* Totals row */}
                              <tr className="bg-emerald-50 dark:bg-emerald-900/20 font-semibold">
                                <td className="w-8 text-center text-[10px] text-muted-foreground border-r border-b border-border bg-zinc-50 dark:bg-zinc-800">
                                  {pricingPreview.displays.length + 2}
                                </td>
                                <td className="px-2 py-2 border-r border-b border-border text-[11px]">
                                  PROJECT TOTAL ({pricingPreview.summary.displayCount} displays)
                                </td>
                                <td className="border-r border-b border-border" />
                                <td className="border-r border-b border-border" />
                                <td className="px-2 py-2 text-right font-mono border-r border-b border-border bg-yellow-100 dark:bg-yellow-900/30">
                                  {fmtUsd(pricingPreview.summary.totalCost)}
                                </td>
                                <td className="px-2 py-2 text-right font-mono border-r border-b border-border bg-yellow-100 dark:bg-yellow-900/30">
                                  {fmtUsd(pricingPreview.summary.totalSellingPrice)}
                                </td>
                                <td className="px-2 py-2 text-center border-r border-b border-border bg-yellow-100 dark:bg-yellow-900/30">
                                  <span className="text-[10px] font-bold">{pricingPreview.summary.blendedMarginPct}%</span>
                                </td>
                                <td className="px-2 py-2 text-center border-b border-border text-[10px] text-muted-foreground">
                                  {pricingPreview.summary.quotedCount}Q / {pricingPreview.summary.rateCardCount}RC
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Empty state — pricing loading */}
                    {!pricingPreview && !loadingPricing && (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                        <FileSpreadsheet className="w-12 h-12 opacity-30" />
                        <p className="text-sm">Pricing is auto-generated from your rate cards</p>
                        <p className="text-xs">Import supplier quotes above to refine with exact costs</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sheet tabs (Excel style) */}
              <div className="flex items-end border-t border-border bg-zinc-50 dark:bg-zinc-800 shrink-0">
                <button
                  onClick={() => setResultsTab("extraction")}
                  className={`px-4 py-1.5 text-[11px] font-medium border-r border-border whitespace-nowrap transition-colors relative ${
                    resultsTab === "extraction"
                      ? "bg-white dark:bg-zinc-900 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  }`}
                >
                  {resultsTab === "extraction" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0A52EF]" />
                  )}
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5 bg-[#0A52EF]" />
                  What We Found
                  <span className="ml-1.5 text-[10px] text-muted-foreground">({result.screens.length} displays)</span>
                </button>
                <button
                  onClick={() => setResultsTab("pricing")}
                  className={`px-4 py-1.5 text-[11px] font-medium border-r border-border whitespace-nowrap transition-colors relative ${
                    resultsTab === "pricing"
                      ? "bg-white dark:bg-zinc-900 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                  }`}
                >
                  {resultsTab === "pricing" && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#217346]" />
                  )}
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5 bg-[#217346]" />
                  Pricing & Quoting
                  {pricingPreview && (
                    <span className="ml-1.5 text-[10px] text-emerald-600">{fmtUsd(pricingPreview.summary.totalSellingPrice)}</span>
                  )}
                  {loadingPricing && <Loader2 className="inline w-3 h-3 ml-1.5 animate-spin" />}
                </button>
              </div>
            </div>

            {/* Link to saved analysis */}
            {result.id && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <Link
                  href={`/tools/rfp-analyzer/history/${result.id}`}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  View saved analysis →
                </Link>
              </div>
            )}
          </div>
          );
        })()}
      </main>
    </div>
  );
}

// ==========================================================================
// Sub-components
// ==========================================================================

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: typeof FileText; label: string; value: string; sub?: string; accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={`w-4 h-4 ${accent || "text-muted-foreground"}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${accent || "text-foreground"}`}>{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Flag({ label }: { label: string }) {
  return (
    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 text-xs font-medium rounded-full">
      {label}
    </span>
  );
}

function PipelineStep({ step, title, description, icon: Icon, status, action }: {
  step: number;
  title: string;
  description: string;
  icon: typeof FileText;
  status: "ready" | "done" | "disabled";
  action: React.ReactNode;
}) {
  return (
    <div className={`bg-background border rounded-xl p-4 space-y-3 ${
      status === "done" ? "border-emerald-500/30" : "border-border"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          status === "done"
            ? "bg-emerald-500 text-white"
            : "bg-primary/10 text-primary"
        }`}>
          {status === "done" ? <CheckCircle2 className="w-4 h-4" /> : step}
        </div>
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

// ==========================================================================
// Triage Minimap
// ==========================================================================

const fmtUsd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

const CAT_COLORS: Record<string, string> = {
  led_specs: "bg-emerald-500",
  drawing: "bg-blue-500",
  cost_schedule: "bg-amber-500",
  scope_of_work: "bg-purple-500",
  technical: "bg-orange-400",
  legal: "bg-slate-300",
  schedule: "bg-cyan-500",
  boilerplate: "bg-slate-200",
  unknown: "bg-slate-200",
};

function TriageMinimap({ triage }: { triage: AnalysisResult["triage"] }) {
  const counts = triage.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        {Object.entries(counts).sort(([, a], [, b]) => b - a).map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${CAT_COLORS[cat] || CAT_COLORS.unknown}`} />
            <span className="text-muted-foreground capitalize">{cat.replace(/_/g, " ")} ({count})</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-[2px]">
        {triage.map((p) => (
          <div
            key={p.pageNumber}
            className={`w-3 h-4 rounded-[2px] ${CAT_COLORS[p.category] || CAT_COLORS.unknown} ${
              p.relevance >= 40 ? "opacity-100" : "opacity-25"
            }`}
            title={`Page ${p.pageNumber}: ${p.category} (${p.relevance}% relevance)${p.isDrawing ? " [Drawing]" : ""}`}
          />
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        Each block = 1 page. Bright = relevant (kept), faded = noise (filtered). Hover for details.
      </p>
    </div>
  );
}
