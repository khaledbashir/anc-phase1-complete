"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Play,
  Clock,
  Monitor,
  CheckCircle,
  TrendingUp,
  Shield,
  Calendar,
  MapPin,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScreenBreakdown {
  screenId: string;
  screenName: string;
  location: string | null;
  manufacturer?: string;
  pixelPitch?: number;
  widthFt?: number;
  heightFt?: number;
  plays: number;
  airtimeSec: number;
  uptimePct: number;
}

interface SampleLog {
  playedAt: string;
  screenName: string;
  contentName: string;
  durationSec: number;
  verified: boolean;
}

interface ReportData {
  venue: { name: string; client: string; city: string; state: string };
  sponsor: { name: string; contact: string | null; email: string | null };
  period: { from: string; to: string; label: string };
  summary: {
    totalPlays: number;
    totalAirtimeSec: number;
    screenCount: number;
    gameDays: number;
    avgUptimePct: number;
    compliancePct: number;
    estimatedImpressions: number;
  };
  screenBreakdown: ScreenBreakdown[];
  sampleLogs: SampleLog[];
}

interface Report {
  id: string;
  title: string;
  totalPlays: number;
  totalAirtime: number;
  uptimePct: number;
  compliancePct: number;
  impressions: number | null;
  screenCount: number;
  shareHash: string | null;
  generatedAt: string;
  reportData: ReportData | null;
  venue: { id: string; name: string; client: string; city: string; state: string };
  sponsor: { id: string; name: string; contact: string | null; email: string | null };
}

interface Props {
  report: Report;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("en-US");
const fmtCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatDuration(totalSec: number): string {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PerformanceReportViewer({ report }: Props) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const data = report.reportData;
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Report data unavailable.
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/performance/reports/${report.id}/pdf`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`PDF generation failed: ${res.status} — ${errText}`);
      }
      const blob = await res.blob();
      if (blob.size === 0) throw new Error("Empty PDF returned");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeSponsor = data.sponsor.name.replace(/[^a-zA-Z0-9]/g, "_");
      const safeVenue = data.venue.name.split(" ").map(w => w[0]).join("").toUpperCase();
      const dateStr = new Date(report.generatedAt).toISOString().slice(0, 10);
      a.download = `ANC_Proof_of_Performance_${safeSponsor}_${safeVenue}_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
      alert(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (report.shareHash) {
      const url = `${window.location.origin}/share/performance/${report.shareHash}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reportId = `POP-${new Date(report.generatedAt).getFullYear()}-${report.venue.name.split(" ").map(w => w[0]).join("").toUpperCase()}-${report.sponsor.name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4)}-${String(report.id).slice(-4).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-zinc-800 print:hidden">
        <div className="max-w-[900px] mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/admin/performance")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Performance
          </button>
          <div className="flex items-center gap-2">
            {report.shareHash && (
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Share Link"}
              </button>
            )}
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {downloading ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round"/></svg>
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {downloading ? "Generating PDF…" : "Download PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* Report Document */}
      <div className="max-w-[900px] mx-auto py-8 px-4 print:py-0 print:px-0 print:max-w-none">
        <div ref={printRef} className="bg-white shadow-2xl print:shadow-none overflow-hidden" style={{ fontFamily: "'Work Sans', sans-serif" }}>

          {/* ═══ HEADER BAND ═══ */}
          <div className="relative bg-[#0A1628] text-white px-10 pt-10 pb-8 overflow-hidden">
            {/* Diagonal slash accent */}
            <div className="absolute top-0 right-0 w-[300px] h-full bg-[#0A52EF] opacity-10 transform skew-x-[-15deg] translate-x-[100px]" />
            <div className="absolute top-0 right-[80px] w-[3px] h-full bg-[#0A52EF] opacity-40 transform skew-x-[-15deg]" />

            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0A52EF] mb-1">
                  ANC Sports Enterprises
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Proof of Performance
                </h1>
                <div className="mt-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300/40 bg-indigo-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-200">
                    <Sparkles className="h-3 w-3" />
                    Demo for Phase 3
                  </span>
                </div>
                <h2 className="text-lg font-light text-white/70 mt-1">
                  Certificate of Advertising Compliance
                </h2>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-1">Report ID</div>
                <div className="text-xs font-mono text-[#0A52EF]">{reportId}</div>
                <div className="text-[10px] text-white/40 mt-1">
                  Generated {formatDate(report.generatedAt)}
                </div>
              </div>
            </div>

            {/* Blue accent line */}
            <div className="mt-6 h-[2px] bg-gradient-to-r from-[#0A52EF] via-[#0A52EF]/50 to-transparent" />
          </div>

          {/* ═══ SPONSOR & VENUE BAR ═══ */}
          <div className="px-10 py-6 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-6">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Sponsor</div>
              <div className="text-lg font-bold text-slate-900">{data.sponsor.name}</div>
              {data.sponsor.contact && (
                <div className="text-xs text-slate-500 mt-0.5">{data.sponsor.contact}</div>
              )}
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Venue</div>
              <div className="text-lg font-bold text-slate-900">{data.venue.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{data.venue.client} — {data.venue.city}, {data.venue.state}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Reporting Period</div>
              <div className="text-lg font-bold text-slate-900">{data.period.label}</div>
            </div>
          </div>

          {/* ═══ HERO METRICS ═══ */}
          <div className="px-10 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={Play}
                label="Total Plays"
                value={fmt.format(data.summary.totalPlays)}
                color="blue"
              />
              <MetricCard
                icon={Clock}
                label="Total Airtime"
                value={formatDuration(data.summary.totalAirtimeSec)}
                color="indigo"
              />
              <MetricCard
                icon={Shield}
                label="Screen Uptime"
                value={`${data.summary.avgUptimePct}%`}
                color="emerald"
                highlight={data.summary.avgUptimePct >= 99}
              />
              <MetricCard
                icon={TrendingUp}
                label="Est. Impressions"
                value={fmtCompact.format(data.summary.estimatedImpressions)}
                color="amber"
              />
            </div>

            {/* Compliance badge */}
            <div className="mt-6 flex items-center justify-center">
              <div className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold",
                data.summary.compliancePct >= 100
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : data.summary.compliancePct >= 90
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-red-50 text-red-700 border border-red-200"
              )}>
                <CheckCircle className="w-5 h-5" />
                Contract Compliance: {data.summary.compliancePct}%
              </div>
            </div>
          </div>

          {/* ═══ SCREEN-BY-SCREEN BREAKDOWN ═══ */}
          <div className="px-10 pb-8">
            <div className="mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500">
                Screen-by-Screen Breakdown
              </h3>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Screen</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Plays</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Airtime</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Uptime</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.screenBreakdown.map((scr, i) => (
                    <tr key={scr.screenId} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{scr.screenName}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">{scr.location || "—"}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{fmt.format(scr.plays)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatDuration(scr.airtimeSec)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={cn(
                          "font-semibold",
                          scr.uptimePct >= 99 ? "text-emerald-600" : scr.uptimePct >= 95 ? "text-amber-600" : "text-red-600"
                        )}>
                          {scr.uptimePct}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                          scr.uptimePct >= 99
                            ? "bg-emerald-100 text-emerald-700"
                            : scr.uptimePct >= 95
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        )}>
                          {scr.uptimePct >= 99 ? "✓ On Track" : scr.uptimePct >= 95 ? "⚠ Warning" : "✗ Below Target"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ PLAY LOG SAMPLE ═══ */}
          <div className="px-10 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500">
                  Recent Play Log
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">
                Showing {data.sampleLogs.length} of {fmt.format(data.summary.totalPlays)} total entries
              </span>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Timestamp</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Screen</th>
                    <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">Content</th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">Duration</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {data.sampleLogs.map((log, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="px-3 py-1.5 text-slate-500">{formatDateTime(log.playedAt)}</td>
                      <td className="px-3 py-1.5 text-slate-700 font-medium font-sans">{log.screenName}</td>
                      <td className="px-3 py-1.5 text-slate-600">{log.contentName}</td>
                      <td className="px-3 py-1.5 text-right text-slate-500">{log.durationSec}s</td>
                      <td className="px-3 py-1.5 text-center">
                        {log.verified ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                        ) : (
                          <span className="text-amber-500 text-[10px] font-bold">PENDING</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ CERTIFICATION FOOTER ═══ */}
          <div className="px-10 py-8 bg-[#0A1628] text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#0A52EF] mb-2">
                  Certification
                </div>
                <p className="text-xs text-white/60 max-w-md leading-relaxed">
                  This report has been generated from verified play log data captured by the ANC content
                  management system. All timestamps are sourced from live system telemetry. Play counts
                  and uptime metrics reflect actual operational performance during the reporting period.
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div>
                    <div className="text-[9px] text-white/30 uppercase tracking-wider">Certified By</div>
                    <div className="text-xs text-white/80 font-medium mt-0.5">ANC Sports Enterprises, LLC</div>
                  </div>
                  <div className="w-[1px] h-8 bg-white/10" />
                  <div>
                    <div className="text-[9px] text-white/30 uppercase tracking-wider">Data Source</div>
                    <div className="text-xs text-white/80 font-medium mt-0.5">vSOFT Content Management System</div>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Report ID</div>
                <div className="text-xs font-mono text-[#0A52EF]">{reportId}</div>
                <div className="text-[9px] text-white/30 mt-2 uppercase tracking-wider">Generated</div>
                <div className="text-xs text-white/60">{formatDate(report.generatedAt)}</div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-bold">
                Proprietary & Confidential
              </div>
              <div className="text-[9px] text-white/20">
                © {new Date().getFullYear()} ANC Sports Enterprises, LLC. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  highlight?: boolean;
}) {
  const bgMap: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200",
    indigo: "bg-indigo-50 border-indigo-200",
    emerald: "bg-emerald-50 border-emerald-200",
    amber: "bg-amber-50 border-amber-200",
  };
  const iconMap: Record<string, string> = {
    blue: "text-blue-600",
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  };
  const valMap: Record<string, string> = {
    blue: "text-blue-900",
    indigo: "text-indigo-900",
    emerald: "text-emerald-900",
    amber: "text-amber-900",
  };

  return (
    <div className={cn(
      "rounded-xl border p-4 text-center",
      bgMap[color] || bgMap.blue,
      highlight && "ring-2 ring-emerald-400 ring-offset-2"
    )}>
      <Icon className={cn("w-5 h-5 mx-auto mb-1.5", iconMap[color])} />
      <div className={cn("text-2xl font-bold", valMap[color])}>{value}</div>
      <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
