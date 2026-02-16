"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  Monitor,
  Users,
  FileText,
  Plus,
  Play,
  Clock,
  TrendingUp,
  ExternalLink,
  Loader2,
  Database,
  CheckCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Screen {
  id: string;
  name: string;
  location: string | null;
  manufacturer: string;
  pixelPitch: number;
  widthFt: number;
  heightFt: number;
}

interface Venue {
  id: string;
  name: string;
  client: string;
  city: string;
  state: string;
  screens: Screen[];
  _count: { reports: number };
}

interface Sponsor {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  _count: { playLogs: number; reports: number };
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
  venue: { id: string; name: string; client: string };
  sponsor: { id: string; name: string };
}

interface Props {
  initialVenues: Venue[];
  initialSponsors: Sponsor[];
  initialReports: Report[];
  totalPlayLogs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("en-US");
const fmtCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function formatDuration(totalSec: number): string {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PerformanceDashboard({ initialVenues, initialSponsors, initialReports, totalPlayLogs }: Props) {
  const router = useRouter();
  const [venues] = useState(initialVenues);
  const [sponsors] = useState(initialSponsors);
  const [reports, setReports] = useState(initialReports);
  const [seeding, setSeeding] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Report generator form
  const [genVenueId, setGenVenueId] = useState("");
  const [genSponsorId, setGenSponsorId] = useState("");
  const [genDateFrom, setGenDateFrom] = useState("2025-10-01");
  const [genDateTo, setGenDateTo] = useState("2026-03-15");

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/performance/seed", { method: "POST" });
      if (!res.ok) throw new Error("Seed failed");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  }, [router]);

  const handleGenerate = useCallback(async () => {
    if (!genVenueId || !genSponsorId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/performance/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId: genVenueId,
          sponsorId: genSponsorId,
          dateFrom: genDateFrom,
          dateTo: genDateTo,
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setReports((prev) => [data.report, ...prev]);
      // Navigate to the report viewer
      router.push(`/admin/performance/report/${data.report.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }, [genVenueId, genSponsorId, genDateFrom, genDateTo]);

  const totalScreens = venues.reduce((s, v) => s + v.screens.length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-normal text-foreground serif-vault flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-brand-blue" />
            Proof of Performance
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Track ad plays across installed screens. Generate branded compliance reports for sponsors.
            Prove every impression. Renew every contract.
          </p>
        </div>
        {venues.length === 0 && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            Seed Demo Data
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Building2} label="Venues" value={venues.length} color="blue" />
        <KPICard icon={Monitor} label="Active Screens" value={totalScreens} color="purple" />
        <KPICard icon={Users} label="Sponsors" value={sponsors.length} color="amber" />
        <KPICard icon={Play} label="Total Play Logs" value={fmtCompact.format(totalPlayLogs)} color="emerald" />
      </div>

      {/* Report Generator */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          Generate Report
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Venue</label>
            <select
              value={genVenueId}
              onChange={(e) => setGenVenueId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select venue...</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sponsor</label>
            <select
              value={genSponsorId}
              onChange={(e) => setGenSponsorId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select sponsor...</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
            <input
              type="date"
              value={genDateFrom}
              onChange={(e) => setGenDateFrom(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
            <input
              type="date"
              value={genDateTo}
              onChange={(e) => setGenDateTo(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !genVenueId || !genSponsorId}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 h-[38px]"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Generated Reports</h2>
          <span className="text-xs text-muted-foreground">{reports.length} reports</span>
        </div>
        {reports.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">
            No reports generated yet. Select a venue and sponsor above to create one.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {reports.map((r) => (
              <div
                key={r.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => router.push(`/admin/performance/report/${r.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{r.title}</div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Play className="w-3 h-3" />{fmt.format(r.totalPlays)} plays</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(r.totalAirtime)}</span>
                    <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />{r.screenCount} screens</span>
                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" />{r.uptimePct}% uptime</span>
                    {r.impressions && (
                      <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{fmtCompact.format(r.impressions)} impressions</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Venues & Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Venues */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" />
              Venues
            </h2>
          </div>
          <div className="divide-y divide-border">
            {venues.map((v) => (
              <div key={v.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{v.name}</div>
                    <div className="text-xs text-muted-foreground">{v.client} — {v.city}, {v.state}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">{v.screens.length}</div>
                    <div className="text-[10px] text-muted-foreground">screens</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {v.screens.map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      <Monitor className="w-2.5 h-2.5" />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sponsors */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Sponsors
            </h2>
          </div>
          <div className="divide-y divide-border">
            {sponsors.map((s) => (
              <div key={s.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.contact} {s.email ? `· ${s.email}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">{fmtCompact.format(s._count.playLogs)}</div>
                  <div className="text-[10px] text-muted-foreground">plays logged</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-500 bg-blue-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
  };
  const cls = colorMap[color] || colorMap.blue;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg p-2", cls)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}
