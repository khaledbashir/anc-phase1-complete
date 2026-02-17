"use client";

import { useRef } from "react";
import {
  Upload,
  Monitor,
  CircleDot,
  RectangleHorizontal,
  Eye,
  Sun,
  Contrast,
  Type,
  X,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export type ViewMode = "scoreboard" | "ribbon" | "courtside" | "all";

interface ControlsHUDProps {
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  brightness: number;
  setBrightness: (v: number) => void;
  multiplyContrast: boolean;
  setMultiplyContrast: (v: boolean) => void;
  clientName: string;
  setClientName: (v: string) => void;
  logoFile: File | null;
  setLogoFile: (f: File | null) => void;
  logoPreviewUrl: string | null;
}

const VIEW_OPTIONS: { id: ViewMode; label: string; icon: any; desc: string }[] = [
  { id: "all", label: "Full Arena", icon: Eye, desc: "See everything" },
  { id: "scoreboard", label: "Center Hung", icon: Monitor, desc: "Main scoreboard" },
  { id: "ribbon", label: "Ribbon Board", icon: CircleDot, desc: "360 upper ring" },
  { id: "courtside", label: "Courtside", icon: RectangleHorizontal, desc: "Field-level boards" },
];

export default function ControlsHUD({
  activeView,
  setActiveView,
  brightness,
  setBrightness,
  multiplyContrast,
  setMultiplyContrast,
  clientName,
  setClientName,
  logoFile,
  setLogoFile,
  logoPreviewUrl,
}: ControlsHUDProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setLogoFile(file);
    e.target.value = "";
  };

  return (
    <div className="absolute top-0 left-0 bottom-0 w-[320px] bg-slate-900/85 backdrop-blur-xl border-r border-white/5 z-20 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/demo"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Back to Demo Hub"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">
              ANC Sponsor Visualizer
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upload a logo. See it on the screens.
            </p>
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="p-5 border-b border-white/5 space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Sponsor Logo
        </label>

        {logoPreviewUrl ? (
          <div className="relative group">
            <div className="bg-black rounded-xl p-4 flex items-center justify-center border border-white/10">
              <img
                src={logoPreviewUrl}
                alt="Logo preview"
                className="max-h-20 max-w-full object-contain"
              />
            </div>
            <button
              onClick={() => setLogoFile(null)}
              className="absolute top-2 right-2 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group"
          >
            <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2 group-hover:text-blue-400 transition-colors" />
            <p className="text-xs text-slate-400">
              Drop a logo here or click to upload
            </p>
            <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, SVG</p>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Client Name */}
      <div className="p-5 border-b border-white/5 space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Type className="w-3 h-3" />
          Client Name
        </label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="ANC PARTNER"
          className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30"
        />
      </div>

      {/* View Switcher */}
      <div className="p-5 border-b border-white/5 space-y-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Camera View
        </label>
        <div className="grid grid-cols-2 gap-2">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveView(opt.id)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center",
                activeView === opt.id
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-400"
                  : "bg-slate-800/40 border-white/5 text-slate-400 hover:bg-slate-800/60 hover:border-white/10"
              )}
            >
              <opt.icon className="w-4 h-4" />
              <span className="text-[11px] font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Brightness */}
      <div className="p-5 border-b border-white/5 space-y-2">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Sun className="w-3 h-3" />
          LED Brightness — {Math.round(brightness * 100)}%
        </label>
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.05}
          value={brightness}
          onChange={(e) => setBrightness(parseFloat(e.target.value))}
          className="w-full accent-blue-500 h-1.5"
        />
      </div>

      {/* Multiply Contrast Toggle */}
      <div className="p-5 border-b border-white/5">
        <button
          onClick={() => setMultiplyContrast(!multiplyContrast)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
            multiplyContrast
              ? "bg-green-500/10 border-green-500/30"
              : "bg-slate-800/40 border-white/5"
          )}
        >
          <Contrast className={cn("w-4 h-4", multiplyContrast ? "text-green-400" : "text-slate-500")} />
          <div className="text-left flex-1">
            <span className={cn("text-xs font-medium", multiplyContrast ? "text-green-400" : "text-slate-400")}>
              Contrast Mode
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Removes white backgrounds from logos
            </p>
          </div>
          <div className={cn(
            "w-8 h-4 rounded-full transition-all relative",
            multiplyContrast ? "bg-green-500" : "bg-slate-600"
          )}>
            <div className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
              multiplyContrast ? "left-4" : "left-0.5"
            )} />
          </div>
        </button>
      </div>

      {/* Footer branding */}
      <div className="mt-auto p-5 border-t border-white/5">
        <p className="text-[10px] text-slate-500 text-center">
          ANC Sports &middot; Premium LED Display Solutions
        </p>
      </div>
    </div>
  );
}
