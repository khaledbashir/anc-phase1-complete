"use client";

import React, { useState, useCallback, useRef } from "react";
import UploadZone, { type PipelineEvent } from "./_components/UploadZone";
import SpecsTable from "./_components/SpecsTable";
import type { ExtractedLEDSpec } from "@/services/rfp/unified/types";
import {
  RefreshCcw,
  Monitor,
  FileText,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  Zap,
} from "lucide-react";

// ==========================================================================
// Types
// ==========================================================================

interface AnalysisResult {
  screens: ExtractedLEDSpec[];
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

type Phase = "upload" | "processing" | "results";

// ==========================================================================
// Main Component — thin client, all heavy lifting is server-side
// ==========================================================================

export default function RfpAnalyzerClient() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ filename: string; pageCount: number; sizeMb: string } | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

    try {
      // ------ Step 1: Upload file ------
      // credentials: "omit" prevents auth cookies from being sent,
      // which avoids 431 "Request Header Fields Too Large" from the proxy
      const sizeMbStr = (file.size / 1024 / 1024).toFixed(0);
      setEvents([{ type: "stage", stage: "uploading", message: `Uploading ${file.name} (${sizeMbStr}MB)...` }]);

      abortRef.current = new AbortController();

      // Send raw binary body (not FormData) so the server can stream
      // directly to disk without buffering the entire file in memory.
      // Filename sent via header.
      const uploadResponse = await fetch("/api/rfp/analyze/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Filename": file.name,
        },
        body: file,
        credentials: "omit",
        signal: abortRef.current.signal,
      });

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        let msg = `Upload failed (${uploadResponse.status})`;
        try { msg = JSON.parse(errText)?.error || msg; } catch {}
        throw new Error(msg);
      }

      const uploadRes: { sessionId: string; filename: string; pageCount: number; sizeMb: string } = await uploadResponse.json();

      setFileInfo({ filename: uploadRes.filename, pageCount: uploadRes.pageCount, sizeMb: uploadRes.sizeMb });
      setEvents([{ type: "stage", stage: "uploaded", message: `Uploaded: ${uploadRes.pageCount.toLocaleString()} pages, ${uploadRes.sizeMb}MB` }]);

      // ------ Step 2: Start automatic pipeline (SSE) ------
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

      // ------ Step 3: Consume SSE stream ------
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

      // If stream ended without complete event
      if (phase !== "results" && !result) {
        // Check if last event was an error
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
  // Reset
  // ========================================================================

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort();
    setPhase("upload");
    setError(null);
    setEvents([]);
    setFileInfo(null);
    setResult(null);
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
                {/* Flags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {result.project.isOutdoor && <Flag label="Outdoor" />}
                  {result.project.isUnionLabor && <Flag label="Union Labor" />}
                  {result.project.bondRequired && <Flag label="Bond Required" />}
                  {result.project.specialRequirements.map((r) => <Flag key={r} label={r} />)}
                </div>
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

// ==========================================================================
// Triage Minimap — compact colored blocks showing page classification
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
  // Count categories
  const counts = triage.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        {Object.entries(counts).sort(([, a], [, b]) => b - a).map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${CAT_COLORS[cat] || CAT_COLORS.unknown}`} />
            <span className="text-muted-foreground capitalize">{cat.replace(/_/g, " ")} ({count})</span>
          </div>
        ))}
      </div>

      {/* Blocks */}
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
