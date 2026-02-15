"use client";

/**
 * VendorDropZone — Drag-and-drop vendor spec ingestion.
 *
 * Accepts vendor PDF/Excel from LG, Yaham etc.
 * Extracts golden metrics and lets the user apply them to the current display.
 */

import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    Upload,
    FileSpreadsheet,
    Check,
    AlertTriangle,
    X,
    ArrowRight,
    Loader2,
    Zap,
    Scale,
    Thermometer,
    Monitor,
    Ruler,
} from "lucide-react";
import type { VendorExtractedSpec } from "@/services/vendor/vendorParser";
import type { DisplayAnswers } from "./questions";

interface VendorDropZoneProps {
    displayIndex: number;
    currentDisplay: DisplayAnswers;
    onApplySpecs: (fields: Partial<DisplayAnswers>, vendorSpec: VendorExtractedSpec) => void;
    onClose: () => void;
}

export default function VendorDropZone({
    displayIndex,
    currentDisplay,
    onApplySpecs,
    onClose,
}: VendorDropZoneProps) {
    const [dragOver, setDragOver] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [spec, setSpec] = useState<VendorExtractedSpec | null>(null);
    const [fileName, setFileName] = useState<string>("");
    const [error, setError] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseFile = useCallback(async (file: File) => {
        setParsing(true);
        setError("");
        setSpec(null);
        setFileName(file.name);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/vendor/parse", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Failed to parse file");
                return;
            }

            setSpec(data.spec);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Parse failed");
        } finally {
            setParsing(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) parseFile(file);
    }, [parseFile]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
    }, [parseFile]);

    const handleApply = useCallback(() => {
        if (!spec) return;

        const fields: Partial<DisplayAnswers> = {};

        // Map vendor spec to display answers
        if (spec.pixelPitch) fields.pixelPitch = String(spec.pixelPitch);

        onApplySpecs(fields, spec);
    }, [spec, onApplySpecs]);

    // Requested vs Actual comparison
    const requestedW = currentDisplay.widthFt;
    const requestedH = currentDisplay.heightFt;
    const actualW = spec?.totalWidthFt;
    const actualH = spec?.totalHeightFt;
    const deltaWIn = actualW ? Math.round((actualW - requestedW) * 12 * 100) / 100 : null;
    const deltaHIn = actualH ? Math.round((actualH - requestedH) * 12 * 100) / 100 : null;
    const hasSigDelta = (deltaWIn && Math.abs(deltaWIn) > 2) || (deltaHIn && Math.abs(deltaHIn) > 2);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="shrink-0 px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#0A52EF]" />
                    <span className="text-sm font-semibold">Vendor Spec Parser</span>
                    {fileName && (
                        <span className="text-xs text-muted-foreground">— {fileName}</span>
                    )}
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Drop zone (show if no spec yet) */}
                {!spec && !parsing && (
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                            dragOver
                                ? "border-[#0A52EF] bg-[#0A52EF]/5"
                                : "border-border hover:border-[#0A52EF]/40 hover:bg-accent/20"
                        )}
                    >
                        <Upload className={cn(
                            "w-10 h-10 mx-auto mb-3 transition-colors",
                            dragOver ? "text-[#0A52EF]" : "text-muted-foreground/40"
                        )} />
                        <p className="text-sm font-medium text-foreground">
                            Drop vendor spec sheet here
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            PDF or Excel from LG, Yaham, Absen, etc.
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.xlsx,.xls,.csv,.txt"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Loading */}
                {parsing && (
                    <div className="flex flex-col items-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#0A52EF] mb-3" />
                        <p className="text-sm text-muted-foreground">Parsing vendor specs...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-destructive">{error}</p>
                            <button
                                onClick={() => { setError(""); setSpec(null); setFileName(""); }}
                                className="text-xs text-[#0A52EF] hover:underline mt-1"
                            >
                                Try another file
                            </button>
                        </div>
                    </div>
                )}

                {/* Extracted specs */}
                {spec && (
                    <>
                        {/* Confidence badge */}
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                spec.confidence === "high" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                spec.confidence === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            )}>
                                {spec.confidence} confidence
                            </span>
                            {spec.manufacturer && (
                                <span className="text-xs text-muted-foreground">
                                    {spec.manufacturer} {spec.modelNumber || ""}
                                </span>
                            )}
                        </div>

                        {/* Warnings */}
                        {spec.warnings.length > 0 && (
                            <div className="space-y-1">
                                {spec.warnings.map((w, i) => (
                                    <div key={i} className="flex items-start gap-1.5 text-xs text-amber-600">
                                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                        {w}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Spec grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <SpecCard
                                icon={Ruler}
                                label="Pixel Pitch"
                                value={spec.pixelPitch ? `${spec.pixelPitch}mm` : "—"}
                            />
                            <SpecCard
                                icon={Monitor}
                                label="Cabinet Size"
                                value={spec.cabinetWidthMm && spec.cabinetHeightMm
                                    ? `${spec.cabinetWidthMm} × ${spec.cabinetHeightMm}mm`
                                    : "—"}
                                sub={spec.cabinetWidthFt && spec.cabinetHeightFt
                                    ? `${spec.cabinetWidthFt.toFixed(2)} × ${spec.cabinetHeightFt.toFixed(2)} ft`
                                    : undefined}
                            />
                            <SpecCard
                                icon={Scale}
                                label="Weight / Cabinet"
                                value={spec.weightKgPerCabinet ? `${spec.weightKgPerCabinet} kg` : "—"}
                                sub={spec.weightKgPerCabinet ? `${Math.round(spec.weightKgPerCabinet * 2.20462)} lbs` : undefined}
                            />
                            <SpecCard
                                icon={Zap}
                                label="Max Power / Cabinet"
                                value={spec.maxPowerWPerCabinet ? `${spec.maxPowerWPerCabinet} W` : "—"}
                                sub={spec.typicalPowerWPerCabinet ? `Typical: ${spec.typicalPowerWPerCabinet} W` : undefined}
                            />
                            <SpecCard
                                icon={Zap}
                                label="Brightness"
                                value={spec.maxNits ? `${spec.maxNits.toLocaleString()} nits` : "—"}
                            />
                            <SpecCard
                                icon={Thermometer}
                                label="Heat Load"
                                value={spec.heatLoadBtu ? `${spec.heatLoadBtu.toLocaleString()} BTU/hr` : "—"}
                                sub={spec.totalMaxPowerW ? `From ${spec.totalMaxPowerW.toLocaleString()} W` : undefined}
                            />
                        </div>

                        {/* Total / Layout section */}
                        {spec.totalCabinets && (
                            <div className="p-3 bg-accent/30 rounded-lg space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layout</p>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <span className="text-xs text-muted-foreground">Grid</span>
                                        <p className="font-medium">{spec.columnsCount} × {spec.rowsCount}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground">Cabinets</span>
                                        <p className="font-medium">{spec.totalCabinets}</p>
                                    </div>
                                    {spec.resolutionW && spec.resolutionH && (
                                        <div>
                                            <span className="text-xs text-muted-foreground">Resolution</span>
                                            <p className="font-medium">{spec.resolutionW} × {spec.resolutionH}</p>
                                        </div>
                                    )}
                                </div>
                                {spec.totalWeightLbs && (
                                    <div className="text-xs text-muted-foreground">
                                        Total: {spec.totalWeightLbs.toLocaleString()} lbs | {spec.totalMaxPowerW?.toLocaleString()} W max
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Closest Fit Delta (if we have both requested and actual) */}
                        {actualW && actualH && requestedW > 0 && requestedH > 0 && (
                            <div className={cn(
                                "p-3 rounded-lg border-2 space-y-2",
                                hasSigDelta ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                            )}>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Requested vs Actual
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">Dimension</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-muted-foreground">Requested</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-muted-foreground">Vendor Actual</span>
                                    </div>

                                    <div className="font-medium">Width</div>
                                    <div className="text-center">{requestedW.toFixed(2)} ft</div>
                                    <div className={cn(
                                        "text-center font-medium",
                                        deltaWIn && Math.abs(deltaWIn) > 2 ? "text-amber-600" : "text-emerald-600"
                                    )}>
                                        {actualW.toFixed(2)} ft
                                        <span className="text-[10px] ml-1">
                                            ({deltaWIn && deltaWIn >= 0 ? "+" : ""}{deltaWIn}")
                                        </span>
                                    </div>

                                    <div className="font-medium">Height</div>
                                    <div className="text-center">{requestedH.toFixed(2)} ft</div>
                                    <div className={cn(
                                        "text-center font-medium",
                                        deltaHIn && Math.abs(deltaHIn) > 2 ? "text-amber-600" : "text-emerald-600"
                                    )}>
                                        {actualH.toFixed(2)} ft
                                        <span className="text-[10px] ml-1">
                                            ({deltaHIn && deltaHIn >= 0 ? "+" : ""}{deltaHIn}")
                                        </span>
                                    </div>
                                </div>
                                {hasSigDelta && (
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                                        Note: Actual screen differs from architectural drawings due to module dimensions.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* IP Rating */}
                        {spec.ipRating && (
                            <div className="text-xs text-muted-foreground">
                                IP Rating: <span className="font-medium text-foreground">{spec.ipRating}</span>
                                {spec.environment && (
                                    <span> ({spec.environment.replace("_", "/")})</span>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={handleApply}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0A52EF] text-white rounded-lg text-sm font-medium hover:bg-[#0A52EF]/90 transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                Apply to Display {displayIndex + 1}
                            </button>
                            <button
                                onClick={() => { setSpec(null); setFileName(""); }}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                Parse another file
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// SPEC CARD — Small card showing a single extracted metric
// ============================================================================

function SpecCard({
    icon: Icon,
    label,
    value,
    sub,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    sub?: string;
}) {
    const isEmpty = value === "—";
    return (
        <div className={cn(
            "p-2.5 rounded-lg border",
            isEmpty ? "border-dashed border-border/60 opacity-50" : "border-border"
        )}>
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-sm font-semibold">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
    );
}
