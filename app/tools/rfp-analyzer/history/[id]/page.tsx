"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Monitor,
  Clock,
  MapPin,
  Building2,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Shield,
  Calendar,
  DollarSign,
  Wrench,
  Info,
  Download,
} from "lucide-react";
import SpecsTable from "../../_components/SpecsTable";
import RequirementsTable from "../../_components/RequirementsTable";
import type { ExtractedLEDSpec, ExtractedRequirement } from "@/services/rfp/unified/types";

// ============================================================================
// Types
// ============================================================================

interface FullAnalysis {
  id: string;
  projectName: string | null;
  clientName: string | null;
  venue: string | null;
  location: string | null;
  filename: string;
  fileSize: number;
  pageCount: number;
  relevantPages: number;
  noisePages: number;
  drawingPages: number;
  specsFound: number;
  processingTimeMs: number;
  visionPages: number;
  screens: ExtractedLEDSpec[];
  requirements: ExtractedRequirement[];
  project: {
    clientName: string | null;
    projectName: string | null;
    venue: string | null;
    location: string | null;
    isOutdoor: boolean;
    isUnionLabor: boolean;
    bondRequired: boolean;
    specialRequirements: string[];
    schedulePhases: Array<{
      phaseName: string;
      startDate: string | null;
      endDate: string | null;
      duration: string | null;
    }>;
  };
  triage: Array<{
    pageNumber: number;
    category: string;
    relevance: number;
    isDrawing: boolean;
  }>;
  status: string;
  createdAt: string;
}

// ============================================================================
// Detail Page
// ============================================================================

export default function AnalysisDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"specs" | "requirements" | "triage">("specs");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/rfp/analyses/${id}`);
        if (!res.ok) throw new Error(res.status === 404 ? "Analysis not found" : "Failed to load");
        const data = await res.json();

        // Parse JSON blobs if they come as strings
        if (typeof data.screens === "string") data.screens = JSON.parse(data.screens);
        if (typeof data.requirements === "string") data.requirements = JSON.parse(data.requirements);
        if (typeof data.project === "string") data.project = JSON.parse(data.project);
        if (typeof data.triage === "string") data.triage = JSON.parse(data.triage);

        setAnalysis(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Excel export (.xlsx via API)
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (!analysis) return;
    setExporting(true);
    try {
      const res = await fetch("/api/rfp/pipeline/extraction-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.id }),
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || `${analysis.projectName || analysis.filename || "rfp-analysis"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading analysis...</span>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex-1 min-h-screen bg-background flex flex-col items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-destructive mb-3" />
        <p className="text-lg font-medium text-foreground">{error || "Analysis not found"}</p>
        <Link href="/tools/rfp-analyzer/history" className="mt-4 text-sm text-primary hover:underline">
          Back to History
        </Link>
      </div>
    );
  }

  const a = analysis;
  const screens = a.screens || [];
  const requirements = a.requirements || [];
  const project = a.project || {};
  const triage = a.triage || [];
  const date = new Date(a.createdAt);

  const criticalReqs = requirements.filter((r) => r.status === "critical").length;
  const riskReqs = requirements.filter((r) => r.status === "risk").length;

  return (
    <div className="flex-1 min-w-0 bg-background relative min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border py-4 px-6 xl:px-8">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/tools/rfp-analyzer/history"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              History
            </Link>
            <div className="w-px h-6 bg-border" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {a.projectName || a.venue || a.filename}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {a.filename} — {a.pageCount.toLocaleString()} pages — {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export .xlsx
          </button>
        </div>
      </header>

      <main className="p-6 xl:px-8 max-w-[1600px] mx-auto space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard icon={FileText} label="Total Pages" value={a.pageCount.toLocaleString()} />
          <StatCard
            icon={CheckCircle2}
            label="Relevant"
            value={a.relevantPages.toString()}
            sub={`${Math.round((a.relevantPages / a.pageCount) * 100)}% kept`}
            accent="text-emerald-500"
          />
          <StatCard icon={Monitor} label="LED Displays" value={a.specsFound.toString()} accent="text-primary" />
          <StatCard
            icon={AlertTriangle}
            label="Requirements"
            value={requirements.length.toString()}
            sub={criticalReqs > 0 ? `${criticalReqs} critical` : undefined}
            accent={criticalReqs > 0 ? "text-red-500" : undefined}
          />
          <StatCard icon={Zap} label="Vision Pages" value={a.visionPages.toString()} />
          <StatCard icon={Clock} label="Processing" value={`${(a.processingTimeMs / 1000).toFixed(1)}s`} />
        </div>

        {/* Project info */}
        {(project.clientName || project.venue || project.projectName) && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Project Information
            </h3>
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

            {/* Flags */}
            <div className="flex flex-wrap gap-2 mt-3">
              {project.isOutdoor && <Flag label="Outdoor" />}
              {project.isUnionLabor && <Flag label="Union Labor" />}
              {project.bondRequired && <Flag label="Bond Required" />}
              {(project.specialRequirements || []).map((r: string) => <Flag key={r} label={r} />)}
            </div>

            {/* Schedule phases */}
            {(project.schedulePhases || []).length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Schedule
                </h4>
                <div className="flex flex-wrap gap-3">
                  {project.schedulePhases.map((p: any, i: number) => (
                    <div key={i} className="px-3 py-2 bg-muted/50 rounded-lg text-xs">
                      <span className="font-medium text-foreground">{p.phaseName}</span>
                      {p.endDate && <span className="text-muted-foreground ml-2">{p.endDate}</span>}
                      {p.duration && <span className="text-muted-foreground ml-2">({p.duration})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex gap-1">
            <TabButton active={activeTab === "specs"} onClick={() => setActiveTab("specs")}>
              <Monitor className="w-4 h-4" />
              LED Displays ({screens.length})
            </TabButton>
            <TabButton active={activeTab === "requirements"} onClick={() => setActiveTab("requirements")}>
              <Shield className="w-4 h-4" />
              Requirements ({requirements.length})
              {criticalReqs > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-full">
                  {criticalReqs}
                </span>
              )}
            </TabButton>
            <TabButton active={activeTab === "triage"} onClick={() => setActiveTab("triage")}>
              <FileText className="w-4 h-4" />
              Page Triage ({triage.length})
            </TabButton>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === "specs" && (
          <div>
            <SpecsTable specs={screens} />
          </div>
        )}

        {activeTab === "requirements" && (
          <div>
            <RequirementsTable requirements={requirements} />
          </div>
        )}

        {activeTab === "triage" && (
          <div className="bg-card border border-border rounded-xl p-5">
            <TriageMinimap triage={triage} />
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

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

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Triage Minimap
// ============================================================================

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

function TriageMinimap({ triage }: { triage: Array<{ pageNumber: number; category: string; relevance: number; isDrawing: boolean }> }) {
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
