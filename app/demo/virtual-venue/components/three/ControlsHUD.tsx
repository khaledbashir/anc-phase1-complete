"use client";

import { useRef, useState } from "react";
import {
  Upload,
  Sun,
  Contrast,
  Type,
  X,
  ChevronLeft,
  Camera,
  Layers,
  DollarSign,
  Palette,
  Video,
  TrendingUp,
  Download,
  Package,
  Zap,
  RotateCcw,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { VENUE_ZONES, CAMERA_PRESETS, PACKAGE_PRESETS, SERVICES_MULTIPLIER, DEFAULT_MARGIN } from "../../data/venueZones";

type TabId = "configure" | "brand" | "value";

interface ControlsHUDProps {
  activeCameraId: string;
  setActiveCameraId: (id: string) => void;
  brightness: number;
  setBrightness: (v: number) => void;
  multiplyBlend: boolean;
  setMultiplyBlend: (v: boolean) => void;
  clientName: string;
  setClientName: (v: string) => void;
  logoFile: File | null;
  setLogoFile: (f: File | null) => void;
  logoPreviewUrl: string | null;
  activeZoneIds: Set<string>;
  toggleZone: (id: string) => void;
  setZoneSet: (ids: string[]) => void;
  totalHardware: number;
  totalSell: number;
  totalAnnualRevenue: number;
  activeZoneCount: number;
  takeScreenshot: () => void;
}

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "configure", label: "Configure", icon: Layers },
  { id: "brand", label: "Brand", icon: Palette },
  { id: "value", label: "Value", icon: DollarSign },
];

const fmtK = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;
const fmtFull = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function ControlsHUD({
  activeCameraId, setActiveCameraId,
  brightness, setBrightness,
  multiplyBlend, setMultiplyBlend,
  clientName, setClientName,
  logoFile, setLogoFile, logoPreviewUrl,
  activeZoneIds, toggleZone, setZoneSet,
  totalHardware, totalSell, totalAnnualRevenue,
  activeZoneCount, takeScreenshot,
}: ControlsHUDProps) {
  const [activeTab, setActiveTab] = useState<TabId>("configure");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setLogoFile(file);
    e.target.value = "";
  };

  const allActive = activeZoneIds.size === VENUE_ZONES.length;

  return (
    <div className="absolute top-0 left-0 bottom-0 w-[380px] bg-[#0a0e1a]/90 backdrop-blur-2xl border-r border-white/[0.06] z-20 flex flex-col">
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Link href="/demo" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Back">
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-white tracking-tight">Virtual Venue Visualizer</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">ANC Sports · Interactive Arena Builder</p>
          </div>
          <button
            onClick={takeScreenshot}
            className="p-2 rounded-lg bg-[#0A52EF]/20 hover:bg-[#0A52EF]/30 transition-colors"
            title="Capture screenshot"
          >
            <Camera className="w-4 h-4 text-[#0A52EF]" />
          </button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex border-b border-white/[0.06]">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all border-b-2",
              activeTab === tab.id
                ? "text-[#0A52EF] border-[#0A52EF] bg-[#0A52EF]/5"
                : "text-slate-500 border-transparent hover:text-slate-300"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">

        {/* ═══ CONFIGURE TAB ═══ */}
        {activeTab === "configure" && (
          <div className="space-y-0">
            {/* Package Presets */}
            <div className="p-4 border-b border-white/[0.04]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block">Quick Packages</label>
              <div className="space-y-1.5">
                {PACKAGE_PRESETS.map(pkg => {
                  const isActive = pkg.zoneIds.every(id => activeZoneIds.has(id)) && activeZoneIds.size === pkg.zoneIds.length;
                  const pkgHardware = pkg.zoneIds.reduce((s, id) => {
                    const z = VENUE_ZONES.find(v => v.id === id);
                    return s + (z ? z.defaultWidthFt * z.defaultHeightFt * z.costPerSqFt * z.quantity : 0);
                  }, 0);
                  const pkgSell = (pkgHardware * (1 + SERVICES_MULTIPLIER)) / (1 - DEFAULT_MARGIN);
                  const pkgRevenue = pkg.zoneIds.reduce((s, id) => {
                    const z = VENUE_ZONES.find(v => v.id === id);
                    return s + (z ? z.annualSponsorRevenue : 0);
                  }, 0);
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setZoneSet(pkg.zoneIds)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        isActive
                          ? "border-white/20 bg-white/[0.06]"
                          : "border-white/[0.04] hover:border-white/10 hover:bg-white/[0.02]"
                      )}
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${pkg.color}20` }}>
                        <Package className="w-4 h-4" style={{ color: pkg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{pkg.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${pkg.color}20`, color: pkg.color }}>{pkg.badge}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{pkg.zoneIds.length} zones · {fmtK(pkgSell)} · {fmtK(pkgRevenue)}/yr rev</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zone Toggles */}
            <div className="p-4 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Screen Zones</label>
                <button
                  onClick={() => allActive ? setZoneSet([]) : setZoneSet(VENUE_ZONES.map(z => z.id))}
                  className="flex items-center gap-1 text-[10px] font-medium text-[#0A52EF] hover:text-blue-300 transition-colors"
                >
                  {allActive ? <><RotateCcw className="w-3 h-3" />Clear</> : <><Zap className="w-3 h-3" />All On</>}
                </button>
              </div>
              <div className="space-y-1">
                {VENUE_ZONES.map(zone => {
                  const isOn = activeZoneIds.has(zone.id);
                  const area = zone.defaultWidthFt * zone.defaultHeightFt * zone.quantity;
                  return (
                    <button
                      key={zone.id}
                      onClick={() => toggleZone(zone.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all text-left",
                        isOn ? "bg-[#0A52EF]/10" : "hover:bg-white/[0.03]"
                      )}
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0 transition-all",
                        isOn ? "bg-[#0A52EF] shadow-[0_0_8px_rgba(10,82,239,0.5)]" : "bg-slate-600"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <zone.icon className={cn("w-3 h-3 shrink-0", isOn ? "text-[#0A52EF]" : "text-slate-500")} />
                          <span className={cn("text-xs font-medium truncate", isOn ? "text-white" : "text-slate-400")}>{zone.name}</span>
                          {zone.quantity > 1 && <span className="text-[9px] text-slate-500">×{zone.quantity}</span>}
                        </div>
                        <p className="text-[9px] text-slate-600 mt-0.5">{zone.pixelPitch} · {area.toLocaleString()} sqft · {fmtK(zone.annualSponsorRevenue)}/yr</p>
                      </div>
                      <div className={cn(
                        "w-7 h-4 rounded-full transition-all relative shrink-0",
                        isOn ? "bg-[#0A52EF]" : "bg-slate-700"
                      )}>
                        <div className={cn(
                          "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                          isOn ? "left-3.5" : "left-0.5"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Camera Presets */}
            <div className="p-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block">Camera Angles</label>
              <div className="grid grid-cols-2 gap-1.5">
                {CAMERA_PRESETS.map(cam => (
                  <button
                    key={cam.id}
                    onClick={() => setActiveCameraId(cam.id)}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left",
                      activeCameraId === cam.id
                        ? "bg-[#0A52EF]/10 border-[#0A52EF]/30 text-[#0A52EF]"
                        : "border-white/[0.04] text-slate-400 hover:bg-white/[0.03] hover:text-slate-300"
                    )}
                  >
                    <Video className="w-3 h-3 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-medium block truncate">{cam.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ BRAND TAB ═══ */}
        {activeTab === "brand" && (
          <div className="space-y-0">
            {/* Logo Upload */}
            <div className="p-4 border-b border-white/[0.04] space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sponsor Logo</label>
              {logoPreviewUrl ? (
                <div className="relative group">
                  <div className="bg-black/50 rounded-xl p-5 flex items-center justify-center border border-white/10">
                    <img src={logoPreviewUrl} alt="Logo" className="max-h-20 max-w-full object-contain" />
                  </div>
                  <button
                    onClick={() => setLogoFile(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-white/8 rounded-xl p-8 text-center hover:border-[#0A52EF]/40 hover:bg-[#0A52EF]/5 transition-all group"
                >
                  <Upload className="w-7 h-7 text-slate-600 mx-auto mb-2 group-hover:text-[#0A52EF] transition-colors" />
                  <p className="text-xs text-slate-400">Drop a logo or click to upload</p>
                  <p className="text-[10px] text-slate-600 mt-1">PNG, JPG, SVG, WebP</p>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleFile} />
            </div>

            {/* Client Name */}
            <div className="p-4 border-b border-white/[0.04] space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Type className="w-3 h-3" />
                Sponsor / Client Name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="ANC PARTNER"
                className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0A52EF]/50 focus:border-[#0A52EF]/30 transition-all"
              />
            </div>

            {/* Brightness */}
            <div className="p-4 border-b border-white/[0.04] space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sun className="w-3 h-3" />
                LED Brightness — {Math.round(brightness * 100)}%
              </label>
              <input
                type="range" min={0.1} max={2} step={0.05} value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                className="w-full accent-[#0A52EF] h-1.5"
              />
            </div>

            {/* Contrast Mode */}
            <div className="p-4">
              <button
                onClick={() => setMultiplyBlend(!multiplyBlend)}
                className={cn(
                  "w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all",
                  multiplyBlend ? "bg-emerald-500/10 border-emerald-500/25" : "bg-white/[0.02] border-white/[0.04]"
                )}
              >
                <Contrast className={cn("w-4 h-4", multiplyBlend ? "text-emerald-400" : "text-slate-500")} />
                <div className="text-left flex-1">
                  <span className={cn("text-xs font-medium", multiplyBlend ? "text-emerald-400" : "text-slate-400")}>
                    Screen Blend Mode
                  </span>
                  <p className="text-[10px] text-slate-600 mt-0.5">Removes white backgrounds from logos</p>
                </div>
                <div className={cn("w-8 h-4 rounded-full transition-all relative", multiplyBlend ? "bg-emerald-500" : "bg-slate-600")}>
                  <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm", multiplyBlend ? "left-4" : "left-0.5")} />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ═══ VALUE TAB ═══ */}
        {activeTab === "value" && (
          <div className="space-y-0">
            {/* Project Pricing */}
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
                  <span className="text-sm font-semibold text-white">Total Project Cost</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-[#0A52EF]">{fmtFull(totalSell)}</span>
                </div>
              </div>
            </div>

            {/* Sponsor Revenue */}
            <div className="p-4 border-b border-white/[0.04]">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Sponsorship Revenue Potential</label>
              <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 mb-3">
                <div className="text-center">
                  <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest font-bold mb-1">Annual Sponsor Revenue</p>
                  <p className="text-3xl font-bold font-mono tabular-nums text-emerald-400">{fmtK(totalAnnualRevenue)}</p>
                  <p className="text-[10px] text-emerald-400/50 mt-1">from {activeZoneCount} active screen zones</p>
                </div>
              </div>
              {/* Per-zone revenue breakdown */}
              <div className="space-y-1.5">
                {VENUE_ZONES.filter(z => activeZoneIds.has(z.id)).map(zone => (
                  <div key={zone.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.02]">
                    <div className="flex items-center gap-2 min-w-0">
                      <zone.icon className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="text-[11px] text-slate-300 truncate">{zone.name}</span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-emerald-400 shrink-0">{fmtK(zone.annualSponsorRevenue)}/yr</span>
                  </div>
                ))}
                {activeZoneCount === 0 && (
                  <p className="text-xs text-slate-600 text-center py-4 italic">Activate zones in Configure tab to see revenue</p>
                )}
              </div>
            </div>

            {/* ROI */}
            {totalSell > 0 && totalAnnualRevenue > 0 && (
              <div className="p-4 border-b border-white/[0.04]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Return on Investment</label>
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
                <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-400/80 leading-relaxed">
                      This configuration generates <strong>{fmtFull(totalAnnualRevenue)}</strong> in annual sponsor revenue,
                      paying back the <strong>{fmtFull(totalSell)}</strong> investment in <strong>{(totalSell / totalAnnualRevenue).toFixed(1)} years</strong>.
                      Over 10 years: <strong className="text-amber-300">{fmtK(totalAnnualRevenue * 10 - totalSell)}</strong> net revenue.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Export Actions */}
            <div className="p-4 space-y-2">
              <button
                onClick={takeScreenshot}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0A52EF] text-white text-sm font-semibold hover:bg-[#0A52EF]/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Arena Screenshot
              </button>
              <p className="text-[9px] text-slate-600 text-center">
                Capture the 3D view to share with clients
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Branding ── */}
      <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <p className="text-[9px] text-slate-600 uppercase tracking-widest font-bold">ANC Sports Enterprises</p>
          <p className="text-[9px] text-slate-600">Premium LED Solutions</p>
        </div>
      </div>
    </div>
  );
}
