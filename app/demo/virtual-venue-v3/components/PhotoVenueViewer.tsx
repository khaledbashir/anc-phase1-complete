"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, Camera, Upload, Type, X, Sun, Contrast,
  Layers, DollarSign, Palette, TrendingUp, Download,
  Eye, EyeOff, MapPin, Monitor, ChevronDown, Maximize2,
} from "lucide-react";
import Link from "next/link";

// ============================================================================
// TYPES
// ============================================================================

interface Hotspot {
  id: string;
  zoneType: string;
  label: string;
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
  cssTransform: string | null;
}

interface Photo {
  id: string;
  label: string;
  imageUrl: string;
  hotspots: Hotspot[];
}

interface Venue {
  id: string;
  name: string;
  client: string;
  city: string;
  state: string;
  photos: Photo[];
}

const ZONE_COLORS: Record<string, string> = {
  scoreboard: "#ef4444",
  ribbon: "#3b82f6",
  fascia: "#8b5cf6",
  vomitory: "#f59e0b",
  concourse: "#10b981",
  marquee: "#ec4899",
  courtside: "#06b6d4",
};

const ZONE_LABELS: Record<string, string> = {
  scoreboard: "Scoreboard",
  ribbon: "Ribbon Board",
  fascia: "Fascia",
  vomitory: "Vomitory",
  concourse: "Concourse",
  marquee: "Marquee",
  courtside: "Courtside",
};

// Rough pricing per zone type (matches V2 data)
const ZONE_PRICING: Record<string, { costPerSqFt: number; annualRevenue: number; defaultArea: number }> = {
  scoreboard: { costPerSqFt: 180, annualRevenue: 2500000, defaultArea: 1200 },
  ribbon: { costPerSqFt: 150, annualRevenue: 1200000, defaultArea: 800 },
  fascia: { costPerSqFt: 120, annualRevenue: 600000, defaultArea: 500 },
  vomitory: { costPerSqFt: 200, annualRevenue: 180000, defaultArea: 24 },
  concourse: { costPerSqFt: 190, annualRevenue: 400000, defaultArea: 80 },
  marquee: { costPerSqFt: 160, annualRevenue: 800000, defaultArea: 400 },
  courtside: { costPerSqFt: 170, annualRevenue: 900000, defaultArea: 600 },
};

const SERVICES_MULTIPLIER = 0.45;
const DEFAULT_MARGIN = 0.38;

// ============================================================================
// BRANDED TEXTURE GENERATOR
// ============================================================================

function makeBrandCanvas(text: string, color: string, w = 400, h = 200): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  // Dark gradient bg
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#030812"); grad.addColorStop(1, "#0a1628");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  // LED grid
  ctx.strokeStyle = `${color}15`; ctx.lineWidth = 0.5;
  for (let x = 0; x < w; x += 4) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  // Text
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.min(w / 6, 48)}px 'Work Sans', sans-serif`;
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 20;
  ctx.fillText(text || "ANC PARTNER", w / 2, h / 2);
  ctx.shadowBlur = 0;
  return c;
}

function makeLogoCanvas(img: HTMLImageElement, w = 400, h = 200): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#030812"; ctx.fillRect(0, 0, w, h);
  const scale = Math.min((w * 0.8) / img.width, (h * 0.8) / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return c;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PhotoVenueViewer() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [clientName, setClientName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [activeZones, setActiveZones] = useState<Set<string>>(new Set());
  const [brightness, setBrightness] = useState(0.85);
  const [presentationMode, setPresentationMode] = useState(false);
  const [brandCanvas, setBrandCanvas] = useState<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<"configure" | "brand" | "value">("configure");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch venues ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/venue-visualizer/venues");
        const data = await res.json();
        setVenues(data.venues || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-select first venue
  useEffect(() => {
    if (venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues, selectedVenueId]);

  const selectedVenue = venues.find(v => v.id === selectedVenueId) || null;
  const selectedPhoto = selectedVenue?.photos[selectedPhotoIdx] || null;

  // Init active zones when venue changes
  useEffect(() => {
    if (selectedPhoto) {
      const types = new Set(selectedPhoto.hotspots.map(h => h.zoneType));
      setActiveZones(types);
    }
  }, [selectedPhoto]);

  // ── Brand texture ──
  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreviewUrl(url);
      const img = new Image();
      img.onload = () => setBrandCanvas(makeLogoCanvas(img));
      img.src = url;
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreviewUrl(null);
      setBrandCanvas(makeBrandCanvas(clientName, "#0A52EF"));
    }
  }, [logoFile, clientName]);

  // Init brand canvas
  useEffect(() => { setBrandCanvas(makeBrandCanvas("", "#0A52EF")); }, []);

  // ── Zone toggle ──
  const toggleZone = (zoneType: string) => {
    setActiveZones(prev => {
      const next = new Set(prev);
      if (next.has(zoneType)) next.delete(zoneType); else next.add(zoneType);
      return next;
    });
  };

  // ── Screenshot ──
  const takeScreenshot = useCallback(() => {
    // Use html2canvas-style approach: just screenshot the viewer area
    // For now, open print dialog
    window.print();
  }, []);

  // ── Pricing ──
  const activeHotspots = selectedPhoto?.hotspots.filter(h => activeZones.has(h.zoneType)) || [];
  const uniqueZoneTypes = [...new Set(activeHotspots.map(h => h.zoneType))];
  const totalHardware = uniqueZoneTypes.reduce((s, zt) => {
    const p = ZONE_PRICING[zt] || ZONE_PRICING.scoreboard;
    return s + p.defaultArea * p.costPerSqFt;
  }, 0);
  const totalProject = totalHardware * (1 + SERVICES_MULTIPLIER);
  const totalSell = totalProject > 0 ? totalProject / (1 - DEFAULT_MARGIN) : 0;
  const totalAnnualRevenue = uniqueZoneTypes.reduce((s, zt) => {
    const p = ZONE_PRICING[zt] || ZONE_PRICING.scoreboard;
    return s + p.annualRevenue;
  }, 0);

  const fmtK = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;
  const fmtFull = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  // ESC to exit presentation
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && presentationMode) setPresentationMode(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [presentationMode]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#030812] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full border-2 border-[#0A52EF]/20 border-t-[#0A52EF] animate-spin" />
          <p className="text-sm text-slate-400">Loading venues...</p>
        </div>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="w-full h-screen bg-[#030812] flex items-center justify-center">
        <div className="text-center space-y-3 max-w-md px-6">
          <Monitor className="w-12 h-12 mx-auto text-slate-600" />
          <h2 className="text-lg font-semibold text-white">No venues configured</h2>
          <p className="text-sm text-slate-400">
            Go to <Link href="/admin/venues" className="text-[#0A52EF] underline">Admin → Venue Visualizer</Link> to
            seed demo data or upload venue photos with hotspots.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#030812] overflow-hidden">
      {/* ── HUD Panel (hidden in presentation mode) ── */}
      {!presentationMode && (
        <div className="absolute top-0 left-0 bottom-0 w-[380px] bg-[#0a0e1a]/90 backdrop-blur-2xl border-r border-white/[0.06] z-20 flex flex-col">
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <Link href="/demo" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </Link>
              <div className="flex-1">
                <h1 className="text-sm font-bold text-white tracking-tight">Virtual Venue V3</h1>
                <p className="text-[10px] text-slate-500 mt-0.5">Photo-Based · Real Venue Imagery</p>
              </div>
              <button onClick={() => setPresentationMode(true)} className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors" title="Presentation Mode">
                <Maximize2 className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Venue Selector */}
          <div className="px-5 py-3 border-b border-white/[0.06]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Venue</label>
            <select
              value={selectedVenueId || ""}
              onChange={e => { setSelectedVenueId(e.target.value); setSelectedPhotoIdx(0); }}
              className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#0A52EF]/50"
            >
              {venues.map(v => (
                <option key={v.id} value={v.id} className="bg-[#0a0e1a] text-white">
                  {v.name} — {v.client}
                </option>
              ))}
            </select>
            {/* Photo angle selector */}
            {selectedVenue && selectedVenue.photos.length > 1 && (
              <div className="flex gap-1.5 mt-2">
                {selectedVenue.photos.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPhotoIdx(i)}
                    className={`flex-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all ${
                      selectedPhotoIdx === i
                        ? "bg-[#0A52EF]/10 border border-[#0A52EF]/30 text-white"
                        : "border border-white/[0.04] text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-white/[0.06]">
            {([
              { id: "configure" as const, label: "Configure", icon: Layers },
              { id: "brand" as const, label: "Brand", icon: Palette },
              { id: "value" as const, label: "Value", icon: DollarSign },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "text-[#0A52EF] border-[#0A52EF] bg-[#0A52EF]/5"
                    : "text-slate-500 border-transparent hover:text-slate-300"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {/* ═══ CONFIGURE TAB ═══ */}
            {activeTab === "configure" && selectedPhoto && (
              <div className="space-y-0">
                <div className="p-4 border-b border-white/[0.04]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block">Screen Zones</label>
                  <div className="space-y-1">
                    {[...new Set(selectedPhoto.hotspots.map(h => h.zoneType))].map(zt => {
                      const isOn = activeZones.has(zt);
                      const count = selectedPhoto.hotspots.filter(h => h.zoneType === zt).length;
                      const color = ZONE_COLORS[zt] || "#6b7280";
                      return (
                        <button
                          key={zt}
                          onClick={() => toggleZone(zt)}
                          className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all text-left ${
                            isOn ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isOn ? color : "#4b5563", boxShadow: isOn ? `0 0 8px ${color}50` : "none" }} />
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-medium ${isOn ? "text-white" : "text-slate-400"}`}>
                              {ZONE_LABELS[zt] || zt}
                            </span>
                            {count > 1 && <span className="text-[9px] text-slate-500 ml-1">×{count}</span>}
                          </div>
                          <div className={`w-7 h-4 rounded-full transition-all relative shrink-0 ${isOn ? "" : "bg-slate-700"}`} style={isOn ? { backgroundColor: color } : {}}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${isOn ? "left-3.5" : "left-0.5"}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ BRAND TAB ═══ */}
            {activeTab === "brand" && (
              <div className="space-y-0">
                <div className="p-4 border-b border-white/[0.04] space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sponsor Logo</label>
                  {logoPreviewUrl ? (
                    <div className="relative group">
                      <div className="bg-black/50 rounded-xl p-5 flex items-center justify-center border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoPreviewUrl} alt="Logo" className="max-h-20 max-w-full object-contain" />
                      </div>
                      <button onClick={() => setLogoFile(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-white/8 rounded-xl p-8 text-center hover:border-[#0A52EF]/40 hover:bg-[#0A52EF]/5 transition-all group">
                      <Upload className="w-7 h-7 text-slate-600 mx-auto mb-2 group-hover:text-[#0A52EF] transition-colors" />
                      <p className="text-xs text-slate-400">Drop a logo or click to upload</p>
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setLogoFile(f); e.target.value = ""; }} />
                </div>
                <div className="p-4 border-b border-white/[0.04] space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Type className="w-3 h-3" /> Sponsor Name
                  </label>
                  <input
                    type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                    placeholder="ANC PARTNER"
                    className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0A52EF]/50"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sun className="w-3 h-3" /> Screen Opacity — {Math.round(brightness * 100)}%
                  </label>
                  <input type="range" min={0.2} max={1} step={0.05} value={brightness} onChange={e => setBrightness(parseFloat(e.target.value))} className="w-full accent-[#0A52EF] h-1.5" />
                </div>
              </div>
            )}

            {/* ═══ VALUE TAB ═══ */}
            {activeTab === "value" && (
              <div className="space-y-0">
                <div className="p-4 border-b border-white/[0.04]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Project Investment</label>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">LED Hardware</span>
                      <span className="text-xs font-mono tabular-nums text-slate-300">{fmtFull(totalHardware)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Services & Install (+45%)</span>
                      <span className="text-xs font-mono tabular-nums text-slate-300">{fmtFull(totalHardware * SERVICES_MULTIPLIER)}</span>
                    </div>
                    <div className="h-px bg-white/[0.06]" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Total Sell Price</span>
                      <span className="text-lg font-bold font-mono tabular-nums text-[#0A52EF]">{fmtFull(totalSell)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-b border-white/[0.04]">
                  <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4">
                    <div className="text-center">
                      <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest font-bold mb-1">Annual Sponsor Revenue</p>
                      <p className="text-3xl font-bold font-mono tabular-nums text-emerald-400">{fmtK(totalAnnualRevenue)}</p>
                      <p className="text-[10px] text-emerald-400/50 mt-1">from {uniqueZoneTypes.length} active zone types</p>
                    </div>
                  </div>
                </div>
                {totalSell > 0 && totalAnnualRevenue > 0 && (
                  <div className="p-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">ROI</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-amber-400 font-mono">{(totalSell / totalAnnualRevenue).toFixed(1)}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">Years to Payback</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-[#0A52EF] font-mono">{Math.round((totalAnnualRevenue / totalSell) * 100)}%</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1">Annual ROI</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom branding */}
          <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">ANC Sports Enterprises</p>
              <p className="text-[9px] text-slate-600">Photo Venue Visualizer</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN: Photo with LED overlays ── */}
      <div className={`absolute inset-0 ${presentationMode ? "" : "pl-[380px]"} flex items-center justify-center bg-black`}>
        {selectedPhoto ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Photo background */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.label}
              className="max-w-full max-h-full object-contain"
              style={{ userSelect: "none" }}
              draggable={false}
            />

            {/* LED screen overlays — positioned relative to the image */}
            {/* We use an overlay div that matches the image dimensions */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{ width: "100%", height: "100%" }}>
                {activeHotspots.map(hs => (
                  <div
                    key={hs.id}
                    className="absolute overflow-hidden"
                    style={{
                      left: `${hs.leftPct}%`,
                      top: `${hs.topPct}%`,
                      width: `${hs.widthPct}%`,
                      height: `${hs.heightPct}%`,
                      opacity: brightness,
                      transform: hs.cssTransform || undefined,
                    }}
                  >
                    {/* LED screen content — canvas rendered as background */}
                    {brandCanvas && (
                      <canvas
                        ref={el => {
                          if (el && brandCanvas) {
                            el.width = brandCanvas.width;
                            el.height = brandCanvas.height;
                            const ctx = el.getContext("2d");
                            if (ctx) ctx.drawImage(brandCanvas, 0, 0);
                          }
                        }}
                        className="w-full h-full"
                        style={{ imageRendering: "auto" }}
                      />
                    )}
                    {/* Glow effect */}
                    <div
                      className="absolute inset-0 mix-blend-screen pointer-events-none"
                      style={{
                        boxShadow: `0 0 30px 10px ${ZONE_COLORS[hs.zoneType] || "#0A52EF"}30, inset 0 0 20px ${ZONE_COLORS[hs.zoneType] || "#0A52EF"}15`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <Monitor className="w-12 h-12 mx-auto text-slate-700" />
            <p className="text-sm text-slate-500">No photos for this venue</p>
          </div>
        )}
      </div>

      {/* ── Presentation mode overlay ── */}
      {presentationMode && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute top-8 right-8 text-right pointer-events-auto">
            <p className="text-2xl font-bold text-white/[0.07] uppercase tracking-[0.3em]">ANC Sports</p>
            {clientName && <p className="text-lg text-white/[0.05] mt-1 tracking-widest">{clientName}</p>}
          </div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
            <button
              onClick={() => setPresentationMode(false)}
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-[11px] text-white/30 hover:text-white/70 transition-all border border-white/[0.04] hover:border-white/[0.1] backdrop-blur-sm"
            >Press ESC or click to exit</button>
          </div>
          <div className="absolute bottom-8 left-8">
            <div className="flex items-center gap-5 text-[11px] text-white/20">
              <span>{selectedVenue?.name}</span>
              <span>Sell: <strong className="text-emerald-400/40">{fmtK(totalSell)}</strong></span>
              <span>Rev: <strong className="text-amber-400/40">{fmtK(totalAnnualRevenue)}</strong>/yr</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom status bar ── */}
      {!presentationMode && (
        <div className="absolute bottom-0 left-[380px] right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6 text-[11px] text-slate-400">
            <span><strong className="text-white">{uniqueZoneTypes.length}</strong> zone types active</span>
            <span>Sell: <strong className="text-emerald-400">{fmtK(totalSell)}</strong></span>
            <span>Rev: <strong className="text-amber-400">{fmtK(totalAnnualRevenue)}</strong>/yr</span>
          </div>
          <span className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">ANC Sports · Photo Venue V3</span>
        </div>
      )}
    </div>
  );
}
