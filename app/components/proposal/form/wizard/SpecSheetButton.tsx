"use client";

import React, { useState, useCallback } from "react";
import { FileText, Download, Loader2, X, Edit3, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DisplaySpec } from "@/services/specsheet/formSheetParser";

interface SpecSheetButtonProps {
    file: File | null;
}

const MANUAL_FIELDS: { key: keyof DisplaySpec; label: string }[] = [
    { key: "colorTemperatureK", label: "Color Temperature (°K)" },
    { key: "brightnessAdjustment", label: "Brightness Adjustment" },
    { key: "gradationMethod", label: "Gradation Method" },
    { key: "tonalGradation", label: "Tonal Gradation" },
    { key: "colorTempAdjustability", label: "Color Temp Adjustability" },
    { key: "voltageService", label: "Voltage / Service / Phase" },
    { key: "ventilationRequirements", label: "Ventilation Requirements" },
    { key: "ledLampModel", label: "LED Lamp Die Make & Model" },
    { key: "smdLedModel", label: "3-in-1 SMD LED Make & Model" },
];

export default function SpecSheetButton({ file }: SpecSheetButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [displays, setDisplays] = useState<DisplaySpec[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [projectName, setProjectName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [expandedDisplay, setExpandedDisplay] = useState<number | null>(null);

    const handleOpen = useCallback(async () => {
        if (!file) return;
        setOpen(true);
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/specsheet/preview", { method: "POST", body: formData });
            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error || `HTTP ${res.status}`);
                setDisplays([]);
                return;
            }

            setDisplays(data.displays || []);
            setWarnings(data.warnings || []);
            setProjectName(data.projectName || "");
            if (data.displays?.length > 0) {
                setExpandedDisplay(0);
            }
        } catch (err: any) {
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    }, [file]);

    const updateField = useCallback((displayIdx: number, field: string, value: string) => {
        setDisplays((prev) => {
            const next = [...prev];
            next[displayIdx] = { ...next[displayIdx], [field]: value };
            return next;
        });
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!file || displays.length === 0) return;
        setGenerating(true);
        setError(null);

        try {
            const overrides: Record<string, Record<string, string>> = {};
            for (const d of displays) {
                const dOverrides: Record<string, string> = {};
                for (const mf of MANUAL_FIELDS) {
                    const val = (d as any)[mf.key];
                    if (val) dOverrides[mf.key] = val;
                }
                overrides[String(d.index)] = dOverrides;
            }

            const formData = new FormData();
            formData.append("file", file);
            formData.append("overrides", JSON.stringify(overrides));

            const res = await fetch("/api/specsheet/generate", { method: "POST", body: formData });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                throw new Error(errData.error || errData.message || `Failed (${res.status})`);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${projectName || "Spec_Sheets"}_Performance_Standards.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message || String(err));
        } finally {
            setGenerating(false);
        }
    }, [file, displays, projectName]);

    if (!file) return null;

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-medium hover:bg-indigo-500/20 transition-all"
            >
                <FileText className="w-3.5 h-3.5" />
                <span>Spec Sheets</span>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-background border border-border">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-400" />
                            Generate Spec Sheets
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        {loading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                                <span className="ml-2 text-sm text-muted-foreground">Parsing FORM sheet...</span>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-xs text-red-200">
                                {error}
                            </div>
                        )}

                        {!loading && displays.length === 0 && !error && (
                            <div className="text-center py-12 text-muted-foreground text-sm">
                                No displays found in FORM sheet. Make sure the workbook has a &quot;Form&quot; tab.
                            </div>
                        )}

                        {!loading && displays.length > 0 && (
                            <>
                                <div className="flex items-center justify-between px-1">
                                    <div className="text-xs text-muted-foreground">
                                        {displays.length} display{displays.length !== 1 ? "s" : ""} detected
                                        {projectName && <span className="ml-1 font-medium text-foreground">• {projectName}</span>}
                                    </div>
                                </div>

                                {warnings.length > 0 && (
                                    <div className="space-y-1">
                                        {warnings.map((w, i) => (
                                            <div key={i} className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-1.5">
                                                {w}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {displays.map((d, idx) => (
                                    <div key={idx} className="rounded-lg border border-border overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedDisplay(expandedDisplay === idx ? null : idx)}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xs font-bold">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-foreground truncate max-w-[380px]">
                                                        {d.displayName || `Display ${idx + 1}`}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {d.manufacturer} • {d.model} • {d.pixelPitch}mm
                                                        {d.specWidthFt && d.specHeightFt && ` • ${d.specWidthFt}'W × ${d.specHeightFt}'H`}
                                                    </div>
                                                </div>
                                            </div>
                                            {expandedDisplay === idx ? (
                                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </button>

                                        {expandedDisplay === idx && (
                                            <div className="border-t border-border px-4 py-3 space-y-3 bg-muted/20">
                                                {/* Auto-filled summary */}
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                    <div className="text-muted-foreground">Resolution</div>
                                                    <div className="text-foreground font-medium">{d.totalResolutionW && d.totalResolutionH ? `${d.totalResolutionW?.toLocaleString()} × ${d.totalResolutionH?.toLocaleString()}` : "—"}</div>
                                                    <div className="text-muted-foreground">Brightness</div>
                                                    <div className="text-foreground font-medium">{d.brightnessNits ? `${d.brightnessNits.toLocaleString()} nits` : "—"}</div>
                                                    <div className="text-muted-foreground">Max Power</div>
                                                    <div className="text-foreground font-medium">{d.maxPowerW ? `${d.maxPowerW.toLocaleString()} W` : "—"}</div>
                                                    <div className="text-muted-foreground">Weight</div>
                                                    <div className="text-foreground font-medium">{d.panelWeightLbs ? `${d.panelWeightLbs.toLocaleString()} lbs` : "—"}</div>
                                                </div>

                                                {/* Editable manual fields */}
                                                <div className="pt-2 border-t border-border/50">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <Edit3 className="w-3 h-3 text-muted-foreground" />
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Manual Fields</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {MANUAL_FIELDS.map((mf) => (
                                                            <div key={mf.key} className="flex items-center gap-2">
                                                                <label className="text-[10px] text-muted-foreground w-[160px] shrink-0 text-right">
                                                                    {mf.label}
                                                                </label>
                                                                <Input
                                                                    value={(d as any)[mf.key] || ""}
                                                                    onChange={(e) => updateField(idx, mf.key, e.target.value)}
                                                                    placeholder="—"
                                                                    className="h-7 text-xs"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    {!loading && displays.length > 0 && (
                        <div className="shrink-0 pt-4 border-t border-border flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                One page per display • ANC branded PDF
                            </span>
                            <Button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="bg-indigo-500 hover:bg-indigo-600 text-white"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Spec Sheets PDF
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
