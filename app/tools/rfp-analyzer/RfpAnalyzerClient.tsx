"use client";

import React, { useState, useCallback, useRef } from "react";
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
} from "lucide-react";

// ==========================================================================
// Types
// ==========================================================================

interface AnalysisResult {
  id: string | null;
  screens: ExtractedLEDSpec[];
  requirements?: ExtractedRequirement[];
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
  // Pipeline Step 4: Download Subcontractor Excel
  // ========================================================================

  const handleDownloadSubcontractorExcel = async () => {
    if (!result?.id) return;
    setDownloading("subcontractor");
    try {
      const res = await fetch("/api/rfp/pipeline/subcontractor-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: result.id }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "Quote_Request.xlsx";
      a.click();
      URL.revokeObjectURL(url);
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
  // TSV Export
  // ========================================================================

  const handleExportTsv = () => {
    if (!result) return;
    const rows = [
      ["Display Name", "Location", "Width (ft)", "Height (ft)", "Pixel Pitch (mm)", "Brightness (nits)", "Environment", "Quantity", "Service Type", "Mounting", "Confidence", "Source Pages"].join("\t"),
      ...result.screens.map((s) => [
        s.name, s.location, s.widthFt ?? "", s.heightFt ?? "", s.pixelPitchMm ?? "",
        s.brightnessNits ?? "", s.environment, s.quantity, s.serviceType ?? "",
        s.mountingType ?? "", `${Math.round(s.confidence * 100)}%`, (s.sourcePages || []).join(", "),
      ].join("\t")),
    ];

    const reqs = result.requirements || [];
    if (reqs.length > 0) {
      rows.push("", "", "REQUIREMENTS");
      rows.push(["Description", "Category", "Status", "Date", "Source Pages", "Raw Text"].join("\t"));
      for (const r of reqs) {
        rows.push([r.description, r.category, r.status, r.date ?? "", (r.sourcePages || []).join(", "), r.rawText ?? ""].join("\t"));
      }
    }

    const blob = new Blob([rows.join("\n")], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.project?.projectName || fileInfo?.filename || "rfp-analysis"}_specs.tsv`;
    a.click();
    URL.revokeObjectURL(url);
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
            {phase === "results" && result && (
              <button
                onClick={handleExportTsv}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
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
        {phase === "results" && result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out space-y-8">
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
              <StatCard icon={Clock} label="Processing Time" value={`${(result.stats.processingTimeMs / 1000).toFixed(1)}s`} />
              <StatCard icon={Zap} label="Drawings Detected" value={result.stats.drawingPages.toString()} />
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

            {/* Requirements table */}
            {result.requirements && result.requirements.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Requirements & Key Points ({result.requirements.length})
                </h3>
                <RequirementsTable requirements={result.requirements} />
              </div>
            )}

            {/* Triage minimap */}
            {result.triage.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Page Triage Map ({result.triage.length} pages)
                </h3>
                <TriageMinimap triage={result.triage} />
              </div>
            )}

            {/* LED specs table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-primary" />
                  Extracted LED Displays ({result.screens.length})
                </h3>
              </div>
              <SpecsTable specs={result.screens} />
            </div>

            {/* ============ PIPELINE ACTIONS (Steps 4-6) ============ */}
            {result.id && result.screens.length > 0 && (
              <div className="bg-card border-2 border-primary/20 rounded-xl p-6 space-y-6">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  RFP-to-Proposal Pipeline
                </h3>

                {/* Step indicators */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Step 4: Subcontractor Excel */}
                  <PipelineStep
                    step={4}
                    title="Subcontractor Excel"
                    description="Download specs sheet to send for quoting"
                    icon={FileSpreadsheet}
                    status="ready"
                    action={
                      <button
                        onClick={handleDownloadSubcontractorExcel}
                        disabled={downloading === "subcontractor"}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {downloading === "subcontractor" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download Quote Request
                      </button>
                    }
                  />

                  {/* Step 5: Import Quote */}
                  <PipelineStep
                    step={5}
                    title="Quote Integration"
                    description={quoteImportResult
                      ? `${quoteImportResult.quotedCount}/${quoteImportResult.quotes.length} specs quoted`
                      : "Import returned subcontractor quote"
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
                        {quoteImportResult ? "Re-import Quote" : "Import Quote Excel"}
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleImportQuote}
                          className="hidden"
                        />
                      </label>
                    }
                  />

                  {/* Step 6: Rate Card */}
                  <PipelineStep
                    step={6}
                    title="Rate Card Assembly"
                    description="Generate final pricing Excel"
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
                          Preview Pricing
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
                          Download Rate Card
                        </button>
                      </div>
                    }
                  />
                </div>

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

                {/* Pricing preview */}
                {pricingPreview && (
                  <div className="space-y-4">
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-xs text-muted-foreground block">Total Cost</span>
                        <span className="text-lg font-bold">${pricingPreview.summary.totalCost.toLocaleString()}</span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-xs text-muted-foreground block">Total Selling</span>
                        <span className="text-lg font-bold">${pricingPreview.summary.totalSellingPrice.toLocaleString()}</span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-xs text-muted-foreground block">Total Margin</span>
                        <span className="text-lg font-bold text-emerald-600">${pricingPreview.summary.totalMargin.toLocaleString()}</span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <span className="text-xs text-muted-foreground block">Blended Margin</span>
                        <span className="text-lg font-bold text-emerald-600">{pricingPreview.summary.blendedMarginPct}%</span>
                      </div>
                    </div>

                    {/* Per-display pricing table */}
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Display</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Area</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">HW Cost</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total Cost</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Selling</th>
                            <th className="text-center px-4 py-2 font-medium text-muted-foreground">Margin</th>
                            <th className="text-center px-4 py-2 font-medium text-muted-foreground">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pricingPreview.displays.map((d, i) => (
                            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                              <td className="px-4 py-2">
                                <span className="font-medium">{d.name}</span>
                                {d.matchedProduct && (
                                  <span className="block text-xs text-muted-foreground">
                                    {d.matchedProduct.manufacturer} {d.matchedProduct.model} ({d.matchedProduct.fitScore}% fit)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right font-mono">{d.areaSqFt} sqft</td>
                              <td className="px-4 py-2 text-right font-mono">${d.hardwareCost.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-mono">${d.totalCost.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right font-mono font-bold">${d.totalSellingPrice.toLocaleString()}</td>
                              <td className="px-4 py-2 text-center">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  d.blendedMarginPct >= 0.25 ? "bg-emerald-100 text-emerald-700" :
                                  d.blendedMarginPct >= 0.15 ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {(d.blendedMarginPct * 100).toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  d.costSource === "subcontractor_quote"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-muted text-muted-foreground"
                                }`}>
                                  {d.costSource === "subcontractor_quote" ? "Quote" : d.costSource === "rate_card" ? "Rate Card" : "Match"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Link to saved analysis */}
            {result.id && (
              <div className="text-center pt-2">
                <Link
                  href={`/tools/rfp-analyzer/history/${result.id}`}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  View saved analysis →
                </Link>
              </div>
            )}
          </div>
        )}
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
