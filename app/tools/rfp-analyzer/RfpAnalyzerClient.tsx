"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import UploadZone, { type PipelineEvent } from "./_components/UploadZone";
import SpecsTable from "./_components/SpecsTable";
import RequirementsTable from "./_components/RequirementsTable";
import PriceDelta from "./_components/PriceDelta";
import PipelineCheckpoint from "./_components/PipelineCheckpoint";
import dynamic from "next/dynamic";

const PdfSplitPanel = dynamic(() => import("./_components/PdfSplitPanel"), { ssr: false });
import type { ExtractedLEDSpec, ExtractedRequirement } from "@/services/rfp/unified/types";
import {
  RefreshCcw,
  Monitor,
  FileText,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  Download,
  Upload,
  DollarSign,
  FileSpreadsheet,
  AlertTriangle,
  Shield,
  Loader2,
  History,
  MessageSquare,
  ImageIcon,
  Plus,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

// ==========================================================================
// Types
// ==========================================================================

interface PageData {
  pageNumber: number;
  category: string;
  relevance: number;
  markdown: string;
  tables: Array<{ id: string; content: string; format: string }>;
  summary: string;
  thumbnail?: string;
  visionAnalyzed?: boolean;
}

interface AnalysisResult {
  id: string | null;
  screens: ExtractedLEDSpec[];
  requirements?: ExtractedRequirement[];
  aiWorkspaceSlug?: string | null;
  pages?: PageData[];
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
    rateCardEstimate: number | null;
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
  const { data: session } = useSession();
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
  const [resultsTab, setResultsTab] = useState<string>("displays");
  const [customTabs, setCustomTabs] = useState<Array<{ id: string; name: string; content: string }>>([]);
  const [drawingUpload, setDrawingUpload] = useState<{ uploading: boolean; results: Array<{ filename: string; pages: number }> }>({ uploading: false, results: [] });
  const [quotePreviewOpen, setQuotePreviewOpen] = useState(false);
  const [editableSpecs, setEditableSpecs] = useState<ExtractedLEDSpec[]>([]);
  // PDF split-panel viewer
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfViewerPage, setPdfViewerPage] = useState<number | null>(null);
  const [showPdfPanel, setShowPdfPanel] = useState(false);
  // Document browser — category toggles for workspace embedding
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(new Set());
  const [reEmbedding, setReEmbedding] = useState(false);
  const [reEmbedResult, setReEmbedResult] = useState<string | null>(null);

  // ========================================================================
  // Auto-run pricing when extraction completes (no manual step needed)
  // ========================================================================

  useEffect(() => {
    if (result?.id && result.screens.length > 0 && !pricingPreview && !loadingPricing) {
      autoPreviewPricing([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id]);

  // Initialize enabled categories from triage data — relevant pages on, boilerplate off
  useEffect(() => {
    if (result?.triage?.length) {
      const relevant = new Set<string>();
      for (const p of result.triage) {
        // Default ON for useful categories, OFF for noise
        if (p.relevance >= 30 && p.category !== "boilerplate" && p.category !== "unknown") {
          relevant.add(p.category);
        }
      }
      // Always include these if present
      for (const cat of ["led_specs", "technical", "cost_schedule", "scope_of_work", "legal", "schedule"]) {
        if (result.triage.some((p) => p.category === cat)) relevant.add(cat);
      }
      setEnabledCategories(relevant);
    }
  }, [result?.triage]);

  // ========================================================================
  // Upload → auto-pipeline (one SSE stream, fully automatic)
  // ========================================================================

  const handleUpload = useCallback(async (files: File[]) => {
    if (!files.length) return;

    setPhase("processing");
    setError(null);
    setEvents([]);
    setResult(null);
    setQuoteImportResult(null);
    setPricingPreview(null);

    // Create blob URL for PDF viewer (live session — no persistence needed)
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    const blobUrl = URL.createObjectURL(files[0]);
    setPdfBlobUrl(blobUrl);

    try {
      const CHUNK_SIZE = 10 * 1024 * 1024;
      abortRef.current = new AbortController();

      // Upload each file (chunked), collect session IDs
      const uploaded: Array<{ sessionId: string; filename: string; pageCount: number; sizeMb: string }> = [];

      for (let fi = 0; fi < files.length; fi++) {
        const file = files[fi];
        const sizeMbStr = (file.size / 1024 / 1024).toFixed(0);
        const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
        const fileLabel = files.length > 1 ? `(${fi + 1}/${files.length}) ` : "";
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
            message: `${fileLabel}Uploading ${file.name} (${sizeMbStr}MB) — ${pct}%`,
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
            let msg = `Upload failed: ${file.name} chunk ${i + 1}/${totalChunks} (${res.status})`;
            try { msg = JSON.parse(errText)?.error || msg; } catch {}
            throw new Error(msg);
          }

          lastJson = await res.json();
          if (!sessionId) sessionId = lastJson.sessionId;
        }

        uploaded.push(lastJson as { sessionId: string; filename: string; pageCount: number; sizeMb: string });
      }

      const totalPages = uploaded.reduce((sum, u) => sum + u.pageCount, 0);
      const totalSizeMb = uploaded.reduce((sum, u) => sum + parseFloat(u.sizeMb), 0).toFixed(1);
      const displayName = uploaded.length === 1 ? uploaded[0].filename : `${uploaded.length} files`;
      setFileInfo({ filename: displayName, pageCount: totalPages, sizeMb: totalSizeMb });
      setEvents([{ type: "stage", stage: "uploaded", message: `Uploaded: ${totalPages.toLocaleString()} pages, ${totalSizeMb}MB` }]);

      // Send all session IDs to analyze — server merges if multiple
      const response = await fetch("/api/rfp/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: uploaded[0].sessionId,
          filename: uploaded[0].filename,
          ...(uploaded.length > 1 ? { mergeSessionIds: uploaded.map((u) => u.sessionId) } : {}),
        }),
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
    setResultsTab("estimate");
  };

  const updateEditableSpec = (index: number, field: keyof ExtractedLEDSpec, value: any) => {
    setEditableSpecs((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeEditableSpec = (index: number) => {
    setEditableSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  const addEditableSpec = () => {
    setEditableSpecs((prev) => [
      ...prev,
      {
        name: "",
        location: "",
        widthFt: null,
        heightFt: null,
        widthPx: null,
        heightPx: null,
        pixelPitchMm: null,
        brightnessNits: null,
        environment: "indoor" as const,
        quantity: 1,
        serviceType: null,
        mountingType: null,
        maxPowerW: null,
        weightLbs: null,
        specialRequirements: [],
        confidence: 1,
        sourcePages: [],
        sourceType: "text" as const,
        citation: "Manually added",
        notes: null,
      },
    ]);
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
      setResultsTab("estimate");
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

  const handleDownloadScopingWorkbook = async () => {
    if (!result?.id) return;
    setDownloading("scoping");
    try {
      const res = await fetch("/api/rfp/pipeline/scoping-workbook", {
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
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "Scoping_Workbook.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDownloading(null);
    }
  };

  // ========================================================================
  // Create Proposal from RFP extraction
  // ========================================================================

  const handleCreateProposal = async () => {
    if (!result?.id || !session?.user?.email) return;
    setDownloading("creating");
    try {
      const res = await fetch("/api/rfp/pipeline/create-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: result.id,
          userEmail: session.user.email,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed (${res.status})`);
      }
      const data = await res.json();
      window.location.href = `/projects/${data.proposalId}`;
    } catch (err: any) {
      setError(err.message);
      setDownloading(null);
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
    setResultsTab("displays");
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
  // Re-embed workspace with selected categories
  // ========================================================================

  const handleReEmbed = async () => {
    if (!result?.id || !result.pages?.length) return;
    setReEmbedding(true);
    setReEmbedResult(null);
    try {
      const selectedPages = result.pages
        .filter((p) => enabledCategories.has(p.category))
        .map((p) => ({
          pageNumber: p.pageNumber,
          category: p.category,
          markdown: p.markdown,
          tables: p.tables,
        }));

      const res = await fetch("/api/rfp/workspace/re-embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: result.id, selectedPages }),
      });

      if (!res.ok) throw new Error(`Re-embed failed (${res.status})`);
      const data = await res.json();
      setReEmbedResult(`${data.pagesEmbedded} pages embedded across ${data.documentsCreated} documents`);
    } catch (err: any) {
      setReEmbedResult(`Error: ${err.message}`);
    } finally {
      setReEmbedding(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
    setReEmbedResult(null); // Clear stale result
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
            <h1 className="text-2xl font-bold text-foreground">
              {phase === "upload" ? "New RFP" : phase === "processing" ? "Reading your RFP..." : result?.project?.projectName || "RFP Analysis"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {phase === "upload"
                ? "Drop your RFP — specs, pricing, and proposal in minutes"
                : fileInfo
                ? `${fileInfo.filename} — ${fileInfo.pageCount.toLocaleString()} pages, ${fileInfo.sizeMb}MB`
                : ""
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
        {/* Pipeline stepper — always visible */}
        <PipelineStepper
          phase={phase}
          resultsTab={resultsTab}
          hasResult={!!result}
          hasPricing={!!pricingPreview}
          specsFound={result?.stats.specsFound || 0}
          onTabSwitch={setResultsTab}
        />

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

            {/* Project info — collapsible */}
            {(result.project.clientName || result.project.venue || result.project.projectName) && (
              <ProjectInfoCard project={result.project} />
            )}

            {/* ============ TABBED VIEW: Extraction | Pricing ============ */}
            <div className="flex gap-3">
            {/* Left: Workbook */}
            <div className={`bg-white dark:bg-zinc-900 rounded-lg border border-border overflow-hidden shadow-sm ${
              showPdfPanel && pdfBlobUrl ? "flex-1 min-w-0" : "w-full"
            }`}>
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
                      Cross-Check
                    </Link>
                  )}
                  <button
                    onClick={handleDownloadScopingWorkbook}
                    disabled={downloading === "scoping" || !result?.id}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white text-[#217346] hover:bg-white/90 rounded text-[10px] font-bold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {downloading === "scoping" ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                    Full Scoping Workbook
                  </button>
                  <button
                    onClick={handleDownloadRateCard}
                    disabled={downloading === "ratecard" || !result?.id}
                    className="flex items-center gap-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                  >
                    {downloading === "ratecard" ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                    Rate Card
                  </button>
                  <button
                    onClick={handleExportExcel}
                    disabled={downloading === "extraction"}
                    className="flex items-center gap-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                  >
                    {downloading === "extraction" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    Specs .xlsx
                  </button>
                  <button
                    onClick={handleCreateProposal}
                    disabled={downloading === "creating" || !result?.id || !session?.user?.email}
                    className="flex items-center gap-1 px-3 py-1 bg-[#0A52EF] text-white hover:bg-[#0941c3] rounded text-[10px] font-bold transition-colors disabled:opacity-50 shadow-sm ml-1"
                  >
                    {downloading === "creating" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Create Proposal
                  </button>
                  {pdfBlobUrl && (
                    <button
                      onClick={() => setShowPdfPanel(!showPdfPanel)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ml-1 ${
                        showPdfPanel
                          ? "bg-white text-[#217346]"
                          : "bg-white/20 hover:bg-white/30 text-white"
                      }`}
                      title={showPdfPanel ? "Hide PDF" : "Show PDF"}
                    >
                      {showPdfPanel ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      PDF
                    </button>
                  )}
                </div>
              </div>

              {/* Tab content area */}
              <div className="min-h-[400px]">
                {/* ── LED Displays ── */}
                {resultsTab === "displays" && (
                  <div className="p-5 space-y-4">
                    {/* Pricing inline bar */}
                    {pricingPreview && (
                      <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-border rounded-lg">
                        <div className="flex items-center gap-4 text-xs">
                          <DollarSign className="w-4 h-4 text-[#217346] shrink-0" />
                          <span className="font-bold text-foreground">
                            {fmtUsd(pricingPreview.summary.totalSellingPrice)}
                          </span>
                          <span className="text-muted-foreground">
                            {pricingPreview.summary.displayCount} displays · {pricingPreview.summary.blendedMarginPct}% margin · Cost {fmtUsd(pricingPreview.summary.totalCost)}
                          </span>
                        </div>
                        <button
                          onClick={() => setResultsTab("estimate")}
                          className="text-[10px] text-primary hover:underline font-medium shrink-0"
                        >
                          Full breakdown &rarr;
                        </button>
                      </div>
                    )}
                    {loadingPricing && !pricingPreview && (
                      <div className="bg-muted/50 border border-border rounded-lg p-4 flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Calculating estimated pricing from rate cards...</span>
                      </div>
                    )}
                    <SpecsTable
                      specs={result.screens}
                      editable
                      onSpecsChange={(updated) => {
                        // Update result.screens in place for downstream use
                        result.screens = updated;
                        setEditableSpecs(updated);
                      }}
                      onSourceClick={(pg) => {
                        setPdfViewerPage(pg);
                        setShowPdfPanel(true);
                      }}
                    />
                    <PipelineCheckpoint
                      unconfirmedCount={result.screens.filter((s) => s.confidence < 0.8).length}
                      onProceed={() => setResultsTab("estimate")}
                      nextStageLabel="Proceed to Estimate"
                    />
                  </div>
                )}

                {/* ── Requirements ── */}
                {resultsTab === "requirements" && (
                  <div className="p-5">
                    <RequirementsTable requirements={requirements} />
                    {requirements.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">No requirements extracted from this RFP.</p>
                      </div>
                    )}
                    {requirements.length > 0 && (
                      <PipelineCheckpoint
                        unconfirmedCount={requirements.filter((r) => r.priority === "critical").length}
                        onProceed={() => setResultsTab("documents")}
                        nextStageLabel="Review Page Triage"
                      />
                    )}
                  </div>
                )}

                {/* ── Page Triage / Documents ── */}
                {resultsTab === "documents" && (
                  <div className="p-5 space-y-4">
                    {result.triage.length > 0 && (
                      <DocumentBrowser
                        triage={result.triage}
                        hasPages={!!result.pages?.length}
                        enabledCategories={enabledCategories}
                        onToggle={toggleCategory}
                        onReEmbed={handleReEmbed}
                        reEmbedding={reEmbedding}
                        reEmbedResult={reEmbedResult}
                        hasWorkspace={!!result.aiWorkspaceSlug}
                      />
                    )}
                    {/* Upload supplementary drawings */}
                    {result.id && (
                      <div className="flex items-center justify-between px-4 py-2.5 border border-dashed border-border rounded-lg">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">Supplementary Drawings</span>
                          <span className="text-[10px] text-muted-foreground">PDF, PNG, JPG — max 20 pages each</span>
                          {drawingUpload.results.length > 0 && (
                            <span className="text-[10px] text-[#217346] font-medium ml-1">
                              {drawingUpload.results.length} uploaded
                            </span>
                          )}
                        </div>
                        <label className="flex items-center gap-1.5 px-2.5 py-1 border border-border hover:bg-muted text-foreground rounded text-xs font-medium cursor-pointer transition-colors shrink-0">
                          {drawingUpload.uploading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          {drawingUpload.uploading ? "Processing..." : "Upload"}
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
                    )}
                  </div>
                )}

                {/* ── Custom user tabs ── */}
                {customTabs.map((tab) => resultsTab === tab.id && (
                  <div key={tab.id} className="p-5">
                    <textarea
                      value={tab.content}
                      onChange={(e) => setCustomTabs((prev) =>
                        prev.map((t) => t.id === tab.id ? { ...t, content: e.target.value } : t)
                      )}
                      placeholder="Type your notes here..."
                      className="w-full min-h-[300px] bg-transparent text-sm font-mono text-foreground resize-none focus:outline-none placeholder:text-muted-foreground/40"
                    />
                  </div>
                ))}

                {resultsTab === "estimate" && (
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
                              onClick={handleDownloadScopingWorkbook}
                              disabled={downloading === "scoping" || !result?.id}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#217346] text-white rounded-lg text-sm font-bold hover:bg-[#1a5c38] disabled:opacity-50 transition-colors shadow-sm"
                            >
                              {downloading === "scoping" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <FileSpreadsheet className="w-4 h-4" />
                              )}
                              Full Scoping Workbook
                            </button>
                            <div className="flex gap-2">
                              <button
                                onClick={handlePreviewPricing}
                                disabled={loadingPricing}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                              >
                                {loadingPricing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                                {pricingPreview ? "Refresh" : "Preview"}
                              </button>
                              <button
                                onClick={handleDownloadRateCard}
                                disabled={downloading === "ratecard"}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                              >
                                {downloading === "ratecard" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                Rate Card
                              </button>
                            </div>
                          </div>
                        }
                      />
                    </div>

                    {/* Editable quote preview — ExcelPreview style */}
                    {quotePreviewOpen && (
                      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-border overflow-hidden shadow-sm">
                        {/* Green title bar (matches estimator) */}
                        <div className="flex items-center justify-between px-3 py-1.5 bg-[#217346] text-white text-xs shrink-0">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span className="font-medium truncate max-w-[300px]">
                              Quote Request — {result.project.projectName || result.project.venue || "LED Displays"}
                            </span>
                            <span className="text-white/60">({editableSpecs.length} displays)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={handleDownloadSubcontractorExcel}
                              disabled={downloading === "subcontractor" || editableSpecs.length === 0}
                              className="flex items-center gap-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                            >
                              {downloading === "subcontractor" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                              Export .xlsx
                            </button>
                            <button
                              onClick={() => setQuotePreviewOpen(false)}
                              className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[10px] transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Column letters (Excel style) */}
                        <div className="flex border-b border-border bg-zinc-50 dark:bg-zinc-800 shrink-0">
                          <div className="w-10 shrink-0 border-r border-border" />
                          {["A", "B", "C", "D", "E", "F", "G"].map((letter) => (
                            <div key={letter} className="flex-1 min-w-[80px] px-2 py-0.5 text-center text-[10px] font-medium text-muted-foreground border-r border-border last:border-r-0">
                              {letter}
                            </div>
                          ))}
                          <div className="w-10 shrink-0" />
                        </div>

                        {/* Data rows */}
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#0A52EF]/5 dark:bg-[#0A52EF]/10">
                                <td className="w-10 text-center text-[10px] text-muted-foreground border-r border-b border-border bg-zinc-50 dark:bg-zinc-800 font-normal">1</td>
                                <th className="text-left px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border min-w-[160px]">DISPLAY</th>
                                <th className="text-left px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border min-w-[140px]">LOCATION</th>
                                <th className="text-right px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border min-w-[70px]">W (FT)</th>
                                <th className="text-right px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border min-w-[70px]">H (FT)</th>
                                <th className="text-right px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border min-w-[70px]">PITCH</th>
                                <th className="text-center px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-r border-b border-border min-w-[50px]">QTY</th>
                                <th className="text-left px-2 py-1.5 font-semibold text-[11px] text-[#0A52EF] border-b border-border min-w-[140px]">NOTES</th>
                                <th className="w-10 border-b border-border bg-zinc-50 dark:bg-zinc-800" />
                              </tr>
                            </thead>
                            <tbody>
                              {editableSpecs.map((spec, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                  <td className="w-10 text-center text-[10px] text-muted-foreground border-r border-b border-border bg-zinc-50 dark:bg-zinc-800">
                                    {idx + 2}
                                  </td>
                                  <td className="px-0 py-0 border-r border-b border-border">
                                    <input
                                      type="text"
                                      value={spec.name}
                                      onChange={(e) => updateEditableSpec(idx, "name", e.target.value)}
                                      placeholder="Display name"
                                      className="w-full px-2 py-1.5 text-xs bg-transparent focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none cursor-cell placeholder:text-muted-foreground/40"
                                    />
                                  </td>
                                  <td className="px-0 py-0 border-r border-b border-border">
                                    <input
                                      type="text"
                                      value={spec.location}
                                      onChange={(e) => updateEditableSpec(idx, "location", e.target.value)}
                                      placeholder="Location"
                                      className="w-full px-2 py-1.5 text-xs bg-transparent focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none cursor-cell placeholder:text-muted-foreground/40"
                                    />
                                  </td>
                                  <td className="px-0 py-0 border-r border-b border-border">
                                    <input
                                      type="number"
                                      value={spec.widthFt ?? ""}
                                      onChange={(e) => updateEditableSpec(idx, "widthFt", e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-full px-2 py-1.5 text-xs text-right font-mono bg-transparent focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none cursor-cell"
                                    />
                                  </td>
                                  <td className="px-0 py-0 border-r border-b border-border">
                                    <input
                                      type="number"
                                      value={spec.heightFt ?? ""}
                                      onChange={(e) => updateEditableSpec(idx, "heightFt", e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-full px-2 py-1.5 text-xs text-right font-mono bg-transparent focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none cursor-cell"
                                    />
                                  </td>
                                  <td className="px-0 py-0 border-r border-b border-border">
                                    <input
                                      type="number"
                                      value={spec.pixelPitchMm ?? ""}
                                      onChange={(e) => updateEditableSpec(idx, "pixelPitchMm", e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-full px-2 py-1.5 text-xs text-right font-mono bg-transparent focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none cursor-cell"
                                    />
                                  </td>
                                  <td className="px-0 py-0 border-r border-b border-border">
                                    <input
                                      type="number"
                                      value={spec.quantity}
                                      onChange={(e) => updateEditableSpec(idx, "quantity", parseInt(e.target.value) || 1)}
                                      min={1}
                                      className="w-full px-2 py-1.5 text-xs text-center font-mono bg-transparent focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none cursor-cell"
                                    />
                                  </td>
                                  <td className="px-0 py-0 border-b border-border">
                                    <input
                                      type="text"
                                      value={spec.notes ?? ""}
                                      onChange={(e) => updateEditableSpec(idx, "notes", e.target.value || null)}
                                      placeholder="Add note..."
                                      className="w-full px-2 py-1.5 text-xs bg-transparent focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none cursor-cell text-muted-foreground placeholder:text-muted-foreground/30"
                                    />
                                  </td>
                                  <td className="w-10 border-b border-border bg-zinc-50 dark:bg-zinc-800 text-center">
                                    <button
                                      onClick={() => removeEditableSpec(idx)}
                                      className="text-muted-foreground/40 group-hover:text-red-400 hover:!text-red-500 transition-colors text-sm leading-none"
                                      title="Remove display"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {/* Add display row */}
                              <tr
                                onClick={addEditableSpec}
                                className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 cursor-pointer transition-colors"
                              >
                                <td className="w-10 text-center text-[10px] text-muted-foreground border-r border-b border-border bg-zinc-50 dark:bg-zinc-800">
                                  {editableSpecs.length + 2}
                                </td>
                                <td colSpan={7} className="px-2 py-1.5 border-b border-border">
                                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-emerald-600 transition-colors">
                                    <Plus className="w-3 h-3" />
                                    Add display...
                                  </span>
                                </td>
                                <td className="w-10 border-b border-border bg-zinc-50 dark:bg-zinc-800" />
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {editableSpecs.length === 0 && (
                          <div className="p-8 text-center">
                            <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">All displays removed</p>
                            <button onClick={addEditableSpec} className="mt-2 text-xs text-primary hover:underline">
                              Add a display
                            </button>
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
                                  <td className="px-2 py-1.5 text-right border-r border-b border-border">
                                    <span className="font-mono">{fmtUsd(d.hardwareCost)}</span>
                                    {d.costSource === "subcontractor_quote" && d.rateCardEstimate != null && d.rateCardEstimate > 0 && (
                                      <span className="block mt-0.5">
                                        <PriceDelta quotePrice={d.hardwareCost} estimatePrice={d.rateCardEstimate} />
                                      </span>
                                    )}
                                  </td>
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

              {/* Sheet tabs (Excel style — matches estimator) */}
              <div className="flex items-end border-t border-border bg-zinc-50 dark:bg-zinc-800 shrink-0 overflow-x-auto">
                {[
                  { id: "displays", label: "LED Displays", color: "#0A52EF", badge: `${result.screens.length}` },
                  { id: "requirements", label: "Requirements", color: "#F59E0B", badge: criticalReqs > 0 ? `${criticalReqs}` : `${requirements.length}` },
                  { id: "documents", label: "Page Triage", color: "#6366F1", badge: `${result.triage.length}` },
                  { id: "estimate", label: "Estimate", color: "#217346", badge: pricingPreview ? fmtUsd(pricingPreview.summary.totalSellingPrice) : undefined },
                  ...customTabs.map((t) => ({ id: t.id, label: t.name, color: "#8B5CF6", badge: undefined as string | undefined })),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setResultsTab(tab.id)}
                    className={`px-3 py-1.5 text-[11px] font-medium border-r border-border whitespace-nowrap transition-colors relative ${
                      resultsTab === tab.id
                        ? "bg-white dark:bg-zinc-900 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                    }`}
                  >
                    {resultsTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: tab.color }} />
                    )}
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: tab.color }} />
                    {tab.label}
                    {tab.badge && (
                      <span className="ml-1.5 text-[10px] text-muted-foreground">{tab.badge}</span>
                    )}
                    {tab.id === "estimate" && loadingPricing && <Loader2 className="inline w-3 h-3 ml-1.5 animate-spin" />}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const id = `custom-${Date.now()}`;
                    const name = prompt("Tab name:");
                    if (!name) return;
                    setCustomTabs((prev) => [...prev, { id, name, content: "" }]);
                    setResultsTab(id);
                  }}
                  className="px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
                  title="Add worksheet"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: PDF split panel */}
            {showPdfPanel && pdfBlobUrl && (
              <div className="w-[420px] shrink-0 rounded-lg border border-border overflow-hidden shadow-sm self-stretch min-h-[500px]">
                <PdfSplitPanel
                  pdfUrl={pdfBlobUrl}
                  activePage={pdfViewerPage}
                  onClose={() => setShowPdfPanel(false)}
                />
              </div>
            )}
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
    <div className="bg-card border border-border rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3 h-3 ${accent || "text-muted-foreground"}`} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-bold font-mono ${accent || "text-foreground"}`}>{value}</div>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
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

function ProjectInfoCard({ project }: { project: AnalysisResult["project"] }) {
  const [expanded, setExpanded] = useState(false);

  // Primary flags always visible
  const primaryFlags: string[] = [];
  if (project.isOutdoor) primaryFlags.push("Outdoor");
  if (project.isUnionLabor) primaryFlags.push("Union Labor");
  if (project.bondRequired) primaryFlags.push("Bond Required");

  const specialReqs = project.specialRequirements || [];
  const hasExtras = specialReqs.length > 0;

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Project Information</span>
        </div>
        {hasExtras && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{expanded ? "Hide" : "Show"} {specialReqs.length} spec requirements</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {project.clientName && (
          <div>
            <span className="text-xs text-muted-foreground block">Client</span>
            <span className="font-medium">{project.clientName}</span>
          </div>
        )}
        {project.projectName && (
          <div>
            <span className="text-xs text-muted-foreground block">Project</span>
            <span className="font-medium">{project.projectName}</span>
          </div>
        )}
        {project.venue && (
          <div>
            <span className="text-xs text-muted-foreground block">Venue</span>
            <span className="font-medium">{project.venue}</span>
          </div>
        )}
        {project.location && (
          <div className="flex items-start gap-1">
            <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <span className="text-xs text-muted-foreground block">Location</span>
              <span className="font-medium">{project.location}</span>
            </div>
          </div>
        )}
      </div>
      {/* Primary flags — always visible */}
      {primaryFlags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {primaryFlags.map((f) => <Flag key={f} label={f} />)}
        </div>
      )}
      {/* Special requirements — collapsible */}
      {hasExtras && expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex flex-wrap gap-1.5">
            {specialReqs.map((r) => (
              <span key={r} className="px-2 py-0.5 bg-muted text-muted-foreground text-[11px] rounded-md">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineStep({ step, title, description, status, action }: {
  step: number;
  title: string;
  description: string;
  icon?: typeof FileText;
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
// Pipeline Stepper — horizontal workflow progress
// ==========================================================================

const PIPELINE_STAGES = [
  { id: "upload", label: "RFP In", icon: Upload, sub: "Drop your document" },
  { id: "extract", label: "Specs", icon: Monitor, sub: "Pulling specs & requirements" },
  { id: "review", label: "What's Inside", icon: FileText, sub: "Displays, requirements, docs" },
  { id: "price", label: "Estimate", icon: DollarSign, sub: "Rate card, scoping, subs" },
  { id: "proposal", label: "Proposal", icon: ArrowRight, sub: "Build & send" },
] as const;

function PipelineStepper({
  phase,
  resultsTab,
  hasResult,
  hasPricing,
  specsFound,
  onTabSwitch,
}: {
  phase: Phase;
  resultsTab: string;
  hasResult: boolean;
  hasPricing: boolean;
  specsFound: number;
  onTabSwitch: (tab: string) => void;
}) {
  // Determine which stage is active
  let activeIdx = 0;
  if (phase === "processing") activeIdx = 1;
  else if (phase === "results" && resultsTab === "displays") activeIdx = 2;
  else if (phase === "results" && resultsTab === "estimate") activeIdx = 3;
  // Stage 4 (proposal) is only "done" if user clicks Create Proposal

  const getStatus = (idx: number): "done" | "active" | "upcoming" => {
    if (idx < activeIdx) return "done";
    if (idx === activeIdx) return "active";
    // Processing stage counts as active when extracting
    if (phase === "processing" && idx === 1) return "active";
    return "upcoming";
  };

  const handleClick = (idx: number) => {
    if (!hasResult) return;
    if (idx === 2) onTabSwitch("displays");
    if (idx === 3) onTabSwitch("estimate");
  };

  return (
    <div className="mb-6">
      <div className="flex items-center">
        {PIPELINE_STAGES.map((stage, idx) => {
          const status = getStatus(idx);
          const Icon = stage.icon;
          const clickable = hasResult && (idx === 2 || idx === 3);

          return (
            <React.Fragment key={stage.id}>
              {/* Connector */}
              {idx > 0 && (
                <div className="flex-1 flex items-center px-1">
                  <div className={`h-[2px] w-full rounded-full transition-colors ${
                    status === "done" || (idx <= activeIdx) ? "bg-emerald-500" : "bg-border"
                  }`} />
                  <ChevronRight className={`w-3 h-3 shrink-0 -ml-0.5 ${
                    status === "done" || (idx <= activeIdx) ? "text-emerald-500" : "text-muted-foreground/30"
                  }`} />
                </div>
              )}

              {/* Stage */}
              <button
                onClick={() => handleClick(idx)}
                disabled={!clickable}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg shrink-0 transition-all ${
                  status === "active"
                    ? "bg-[#0A52EF]/10 border border-[#0A52EF]/30 text-[#0A52EF]"
                    : status === "done"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted/30 border border-transparent text-muted-foreground/50"
                } ${clickable ? "cursor-pointer hover:bg-accent/50" : "cursor-default"}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  status === "done"
                    ? "bg-emerald-500 text-white"
                    : status === "active"
                    ? "bg-[#0A52EF] text-white"
                    : "bg-muted text-muted-foreground/40"
                }`}>
                  {status === "done" ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-[11px] font-semibold leading-tight">{stage.label}</div>
                  <div className="text-[9px] opacity-70 leading-tight">
                    {status === "done" && idx === 0 ? "Uploaded"
                      : status === "done" && idx === 1 ? `Found ${specsFound} displays`
                      : status === "done" && idx === 2 ? "Reviewed"
                      : stage.sub}
                  </div>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================================================
// Document Browser (replaces old Triage Minimap)
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

const CAT_LABELS: Record<string, string> = {
  led_specs: "LED Specs",
  drawing: "Drawings",
  cost_schedule: "Cost / Pricing",
  scope_of_work: "Scope of Work",
  technical: "Technical",
  legal: "Legal / Bond",
  schedule: "Schedule",
  boilerplate: "Boilerplate",
  unknown: "Other",
};

const CAT_ICONS: Record<string, typeof Monitor> = {
  led_specs: Monitor,
  drawing: ImageIcon,
  cost_schedule: DollarSign,
  scope_of_work: FileText,
  technical: Shield,
  legal: Shield,
  schedule: Clock,
  boilerplate: FileText,
  unknown: FileText,
};

function DocumentBrowser({
  triage,
  hasPages,
  enabledCategories,
  onToggle,
  onReEmbed,
  reEmbedding,
  reEmbedResult,
  hasWorkspace,
}: {
  triage: AnalysisResult["triage"];
  hasPages: boolean;
  enabledCategories: Set<string>;
  onToggle: (cat: string) => void;
  onReEmbed: () => void;
  reEmbedding: boolean;
  reEmbedResult: string | null;
  hasWorkspace: boolean;
}) {
  // Group pages by category with stats
  const groups = triage.reduce<Record<string, { pages: number[]; relevant: number; total: number }>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = { pages: [], relevant: 0, total: 0 };
    acc[p.category].pages.push(p.pageNumber);
    acc[p.category].total++;
    if (p.relevance >= 40) acc[p.category].relevant++;
    return acc;
  }, {});

  // Sort: most relevant categories first, boilerplate/unknown last
  const sortedCats = Object.entries(groups).sort(([a, ga], [b, gb]) => {
    if (a === "boilerplate" || a === "unknown") return 1;
    if (b === "boilerplate" || b === "unknown") return -1;
    return gb.relevant - ga.relevant;
  });

  const enabledPageCount = triage.filter((p) => enabledCategories.has(p.category)).length;
  const hasChanges = hasPages && hasWorkspace;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Document Categories ({triage.length} pages)</span>
        </div>
        {hasChanges && (
          <button
            onClick={onReEmbed}
            disabled={reEmbedding || enabledPageCount === 0}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0A52EF] hover:bg-[#0840C0] disabled:opacity-50 text-white rounded text-[10px] font-medium transition-colors"
          >
            {reEmbedding ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {reEmbedding ? "Updating..." : `Update Reference Library (${enabledPageCount} pages)`}
          </button>
        )}
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {sortedCats.map(([cat, data]) => {
          const enabled = enabledCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => onToggle(cat)}
              className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all ${
                enabled
                  ? "border-[#0A52EF]/30 bg-[#0A52EF]/5"
                  : "border-border bg-muted/30 opacity-50"
              }`}
            >
              {(() => { const CatIcon = CAT_ICONS[cat] || CAT_ICONS.unknown; return <CatIcon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />; })()}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium truncate">{CAT_LABELS[cat] || cat}</span>
                  {enabled ? (
                    <ToggleRight className="w-3.5 h-3.5 text-[#0A52EF] shrink-0" />
                  ) : (
                    <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {data.total} page{data.total !== 1 ? "s" : ""}
                  {data.relevant < data.total && ` · ${data.relevant} relevant`}
                </span>
                {/* Mini page blocks */}
                <div className="flex flex-wrap gap-[1px] mt-1.5">
                  {data.pages.slice(0, 30).map((pn) => {
                    const page = triage.find((t) => t.pageNumber === pn);
                    return (
                      <div
                        key={pn}
                        className={`w-2 h-2.5 rounded-[1px] ${CAT_COLORS[cat] || CAT_COLORS.unknown} ${
                          page && page.relevance >= 40 ? "opacity-100" : "opacity-30"
                        }`}
                        title={`Page ${pn}${page ? ` (${page.relevance}% relevance)` : ""}`}
                      />
                    );
                  })}
                  {data.pages.length > 30 && (
                    <span className="text-[8px] text-muted-foreground ml-0.5">+{data.pages.length - 30}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status message */}
      {reEmbedResult && (
        <p className={`text-xs mt-2 ${reEmbedResult.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
          {reEmbedResult.startsWith("Error") ? "⚠ " : "✓ "}{reEmbedResult}
        </p>
      )}

      {!hasPages && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Category selection available during live analysis. From history, workspace uses original embedding.
        </p>
      )}
    </div>
  );
}
