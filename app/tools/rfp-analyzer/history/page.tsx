"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  Monitor,
  Clock,
  MapPin,
  Building2,
  ChevronRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface AnalysisSummary {
  id: string;
  projectName: string | null;
  clientName: string | null;
  venue: string | null;
  location: string | null;
  filename: string;
  fileSize: number;
  pageCount: number;
  relevantPages: number;
  specsFound: number;
  processingTimeMs: number;
  status: string;
  createdAt: string;
}

// ============================================================================
// Main Page
// ============================================================================

export default function RfpHistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch analyses
  const fetchAnalyses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/rfp/analyses?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setAnalyses(data.analyses);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch analyses:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, offset]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="flex-1 min-w-0 bg-background relative min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border py-4 px-6 xl:px-8">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <Link
              href="/tools/rfp-analyzer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Analyzer
            </Link>
            <div className="w-px h-6 bg-border" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analysis History</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {total} {total === 1 ? "analysis" : "analyses"} saved
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects, venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>
      </header>

      <main className="p-6 xl:px-8 max-w-[1600px] mx-auto">
        {loading && analyses.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading analyses...</span>
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-24">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {debouncedSearch ? "No analyses match your search" : "No analyses yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {debouncedSearch ? "Try a different search term" : "Upload an RFP to get started"}
            </p>
            {!debouncedSearch && (
              <Link
                href="/tools/rfp-analyzer"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Monitor className="w-4 h-4" />
                New Analysis
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Results grid */}
            <div className="grid gap-3">
              {analyses.map((a) => (
                <AnalysisRow key={a.id} analysis={a} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                    className="px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Analysis Row — clickable card for each saved analysis
// ============================================================================

function AnalysisRow({ analysis: a }: { analysis: AnalysisSummary }) {
  const date = new Date(a.createdAt);
  const timeAgo = getTimeAgo(date);
  const sizeMb = (a.fileSize / 1024 / 1024).toFixed(1);

  return (
    <Link href={`/tools/rfp-analyzer/history/${a.id}`}>
      <div className="group bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer">
        <div className="flex items-center gap-4">
          {/* Status icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            a.status === "complete" ? "bg-emerald-500/10" :
            a.status === "failed" ? "bg-destructive/10" :
            "bg-amber-500/10"
          }`}>
            {a.status === "complete" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : a.status === "failed" ? (
              <XCircle className="w-5 h-5 text-destructive" />
            ) : (
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            )}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {a.projectName || a.venue || a.filename}
              </h3>
              {a.status === "failed" && (
                <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-[10px] font-medium rounded-full">FAILED</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {a.clientName && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {a.clientName}
                </span>
              )}
              {a.venue && a.venue !== (a.projectName || "") && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {a.venue}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {a.filename}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="font-bold text-foreground">{a.specsFound}</div>
              <div className="text-[10px] text-muted-foreground">displays</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-foreground">{a.pageCount.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">pages</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-foreground">{a.relevantPages}</div>
              <div className="text-[10px] text-muted-foreground">relevant</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-xs text-muted-foreground">{sizeMb}MB</div>
            </div>
          </div>

          {/* Time + chevron */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo}
              </div>
              {a.processingTimeMs > 0 && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {(a.processingTimeMs / 1000).toFixed(1)}s processing
                </div>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
