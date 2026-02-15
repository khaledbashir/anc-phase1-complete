"use client";

/**
 * CutSheetPanel — Auto-generates per-display spec sheets.
 * Shows product specs, layout info, power/weight, installation notes.
 * Copy to clipboard or download as .txt for submittal packages.
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  X,
  FileText,
  Copy,
  Download,
  Check,
  Loader2,
  Zap,
  Ruler,
  Grid3X3,
  Monitor,
} from "lucide-react";
import type { ScreenCalc } from "./EstimatorBridge";
import type { EstimatorAnswers } from "./questions";

interface CutSheetPanelProps {
  open: boolean;
  onClose: () => void;
  answers: EstimatorAnswers;
  calcs: ScreenCalc[];
}

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function CutSheetPanel({ open, onClose, answers, calcs }: CutSheetPanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [textSheets, setTextSheets] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (answers.displays.length === 0) return;
    setGenerating(true);

    try {
      const displayInputs = answers.displays.map((d, i) => {
        const calc = calcs[i];
        return {
          displayName: d.displayName || `Display ${i + 1}`,
          displayType: d.displayType,
          locationType: d.locationType,
          serviceType: d.serviceType,
          isIndoor: answers.isIndoor,
          isReplacement: d.isReplacement,
          widthFt: d.widthFt,
          heightFt: d.heightFt,
          pixelPitch: d.pixelPitch,
          productName: d.productName || undefined,
          installComplexity: d.installComplexity,
          dataRunDistance: d.dataRunDistance,
          liftType: d.liftType,
          areaSqFt: calc?.areaSqFt,
          resolutionW: calc?.pixelsW,
          resolutionH: calc?.pixelsH,
          totalPixels: calc?.totalPixels,
          hardwareCost: calc?.hardwareCost,
          totalCost: calc?.totalCost,
          sellPrice: calc?.sellPrice,
          // Cabinet layout from calc
          cabinetWidthMm: calc?.cabinetLayout?.cabinetWidthMm,
          cabinetHeightMm: calc?.cabinetLayout?.cabinetHeightMm,
          columnsCount: calc?.cabinetLayout?.columnsCount,
          rowsCount: calc?.cabinetLayout?.rowsCount,
          totalCabinets: calc?.cabinetLayout?.totalCabinets,
          actualWidthFt: calc?.cabinetLayout?.actualWidthFt,
          actualHeightFt: calc?.cabinetLayout?.actualHeightFt,
          actualAreaSqFt: calc?.cabinetLayout?.actualAreaSqFt,
          totalWeightLbs: calc?.cabinetLayout?.totalWeightLbs,
          totalWeightKg: calc?.cabinetLayout?.totalWeightKg,
          maxPowerW: calc?.cabinetLayout?.totalMaxPowerW,
          typicalPowerW: calc?.cabinetLayout?.totalTypicalPowerW,
          heatLoadBtu: calc?.cabinetLayout?.heatLoadBtu,
        };
      });

      const res = await fetch("/api/cutsheet/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: answers.projectName,
          clientName: answers.clientName,
          location: answers.location,
          displays: displayInputs,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setTextSheets(data.textSheets);
      setGenerated(true);
    } catch (err) {
      console.error("Cut sheet generation error:", err);
    } finally {
      setGenerating(false);
    }
  }, [answers, calcs]);

  const handleCopy = useCallback(async () => {
    const text = textSheets[activeTab];
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [textSheets, activeTab]);

  const handleDownload = useCallback(() => {
    const text = textSheets[activeTab];
    if (!text) return;
    const displayName = answers.displays[activeTab]?.displayName || `Display_${activeTab + 1}`;
    const fileName = `ANC_CutSheet_${displayName.replace(/\s+/g, "_")}.txt`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [textSheets, activeTab, answers.displays]);

  const handleDownloadAll = useCallback(() => {
    textSheets.forEach((text, i) => {
      const displayName = answers.displays[i]?.displayName || `Display_${i + 1}`;
      const fileName = `ANC_CutSheet_${displayName.replace(/\s+/g, "_")}.txt`;
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }, [textSheets, answers.displays]);

  if (!open) return null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold">Cut Sheets</span>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-medium">
            {answers.displays.length} display{answers.displays.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {answers.displays.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Add a display to generate cut sheets.
          </div>
        ) : !generated ? (
          <PreGenerateView
            answers={answers}
            calcs={calcs}
            generating={generating}
            onGenerate={handleGenerate}
          />
        ) : (
          <GeneratedView
            answers={answers}
            calcs={calcs}
            textSheets={textSheets}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            copied={copied}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onDownloadAll={handleDownloadAll}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PRE-GENERATE VIEW
// ============================================================================

function PreGenerateView({
  answers,
  calcs,
  generating,
  onGenerate,
}: {
  answers: EstimatorAnswers;
  calcs: ScreenCalc[];
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="p-5 space-y-4">
      <p className="text-xs text-muted-foreground">
        Generate spec cut sheets for each display. Includes dimensions, resolution, power, weight,
        and installation notes. Download as text for submittal packages.
      </p>

      {/* Display summary */}
      {answers.displays.map((d, i) => {
        const calc = calcs[i];
        return (
          <div key={i} className="p-3 rounded-lg bg-accent/20 space-y-2">
            <div className="flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-medium">{d.displayName || `Display ${i + 1}`}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Ruler className="w-3 h-3" />
                {d.widthFt}&apos; × {d.heightFt}&apos;
              </div>
              <div className="flex items-center gap-1">
                <Grid3X3 className="w-3 h-3" />
                {d.pixelPitch}mm
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {calc ? `${(calc.areaSqFt).toFixed(0)} sqft` : "—"}
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={onGenerate}
        disabled={generating}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1C1C1C] text-white rounded-lg text-sm font-medium hover:bg-[#1C1C1C]/90 transition-colors disabled:opacity-40"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Generate Cut Sheets
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// GENERATED VIEW
// ============================================================================

function GeneratedView({
  answers,
  calcs,
  textSheets,
  activeTab,
  onTabChange,
  copied,
  onCopy,
  onDownload,
  onDownloadAll,
}: {
  answers: EstimatorAnswers;
  calcs: ScreenCalc[];
  textSheets: string[];
  activeTab: number;
  onTabChange: (i: number) => void;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onDownloadAll: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      {textSheets.length > 1 && (
        <div className="shrink-0 flex gap-1 px-4 pt-3 overflow-x-auto">
          {answers.displays.map((d, i) => (
            <button
              key={i}
              onClick={() => onTabChange(i)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-t whitespace-nowrap transition-colors ${
                activeTab === i
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                  : "text-muted-foreground hover:bg-accent/30"
              }`}
            >
              {d.displayName || `Display ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-foreground bg-accent/20 rounded-lg p-4 overflow-x-auto">
          {textSheets[activeTab]}
        </pre>
      </div>

      {/* Actions */}
      <div className="shrink-0 px-4 py-3 border-t border-border flex items-center gap-2">
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <Download className="w-3 h-3" />
          Download
        </button>
        {textSheets.length > 1 && (
          <button
            onClick={onDownloadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1C1C] text-white rounded text-xs font-medium hover:bg-[#1C1C1C]/90 transition-colors ml-auto"
          >
            <Download className="w-3 h-3" />
            Download All ({textSheets.length})
          </button>
        )}
      </div>
    </div>
  );
}
