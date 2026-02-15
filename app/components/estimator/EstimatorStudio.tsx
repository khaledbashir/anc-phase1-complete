"use client";

/**
 * EstimatorStudio — Split-screen Intelligence Mode workspace.
 *
 * Left panel:  Typeform-style questionnaire (QuestionFlow)
 * Right panel: Live Excel preview with sheet tabs (ExcelPreview)
 *
 * Same pattern as Mirror Mode (form + PDF preview) but for building estimates.
 */

import React, { useState, useCallback, useMemo } from "react";
import { FileSpreadsheet, ArrowLeft, Download, Loader2, MessageSquare, Copy, ArrowRightLeft, Package, Boxes } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QuestionFlow from "./QuestionFlow";
import ExcelPreview from "./ExcelPreview";
import EstimatorCopilot from "./EstimatorCopilot";
import { buildPreviewSheets, calculateDisplay, type ExcelPreviewData, type SheetTab, type ProductSpec } from "./EstimatorBridge";
import { getDefaultAnswers, type EstimatorAnswers, type DisplayAnswers } from "./questions";
import VendorDropZone from "./VendorDropZone";
import BundlePanel from "./BundlePanel";
import type { VendorExtractedSpec } from "@/services/vendor/vendorParser";
import { useProductSpecs } from "@/hooks/useProductSpecs";
import { exportEstimatorExcel } from "./exportEstimatorExcel";
import { useRateCard } from "@/hooks/useRateCard";
import { useEstimatorAutoSave } from "@/hooks/useEstimatorAutoSave";

const SHEET_COLORS = ["#6366F1", "#EC4899", "#14B8A6", "#F59E0B", "#8B5CF6", "#EF4444"];

interface EstimatorStudioProps {
    projectId?: string;
    initialAnswers?: EstimatorAnswers;
    initialCellOverrides?: Record<string, string | number>;
    initialCustomSheets?: SheetTab[];
}

export default function EstimatorStudio({
    projectId,
    initialAnswers,
    initialCellOverrides,
    initialCustomSheets,
}: EstimatorStudioProps = {}) {
    const router = useRouter();
    const [answers, setAnswers] = useState<EstimatorAnswers>(initialAnswers || getDefaultAnswers());
    const [exporting, setExporting] = useState(false);
    const [copilotOpen, setCopilotOpen] = useState(false);
    const [converting, setConverting] = useState(false);
    const [duplicating, setDuplicating] = useState(false);
    const [vendorOpen, setVendorOpen] = useState(false);
    const [bundleOpen, setBundleOpen] = useState(false);
    // Cell overrides: key = "sheetIdx-rowIdx-colIdx", value = edited value
    const [cellOverrides, setCellOverrides] = useState<Record<string, string | number>>(initialCellOverrides || {});
    // User-added custom sheets
    const [customSheets, setCustomSheets] = useState<SheetTab[]>(initialCustomSheets || []);
    // Rate card from DB (replaces hardcoded constants)
    const { rates, loading: ratesLoading } = useRateCard();
    // Auto-save to DB when projectId is provided
    const { status: saveStatus } = useEstimatorAutoSave({
        projectId,
        answers,
        cellOverrides,
        customSheets,
        rates,
    });

    // Fetch product specs for cabinet layout calculations
    const productIds = useMemo(() =>
        answers.displays.map((d) => d.productId).filter(Boolean),
        [answers.displays]
    );
    const { specs: productSpecs } = useProductSpecs(productIds);

    // Calculate per-display cost breakdowns (used by copilot for query responses)
    const calcs = useMemo(() => {
        return answers.displays.map((d) => {
            const spec = d.productId ? productSpecs[d.productId] : null;
            return calculateDisplay(d, answers, rates ?? undefined, spec);
        });
    }, [answers, rates, productSpecs]);

    // Build preview data reactively from answers + rate card
    const basePreviewData: ExcelPreviewData = useMemo(() => {
        return buildPreviewSheets(answers, rates ?? undefined);
    }, [answers, rates]);

    // Merge computed data + custom sheets + cell overrides
    const previewData: ExcelPreviewData = useMemo(() => {
        const allSheets = [...basePreviewData.sheets, ...customSheets];

        // Deep clone and apply overrides
        const sheets = allSheets.map((sheet, si) => ({
            ...sheet,
            rows: sheet.rows.map((row, ri) => ({
                ...row,
                cells: row.cells.map((cell, ci) => {
                    const key = `${si}-${ri}-${ci}`;
                    if (key in cellOverrides) {
                        const raw = cellOverrides[key];
                        const numVal = typeof raw === "string" ? parseFloat(raw) : raw;
                        const isNum = !isNaN(numVal as number) && raw !== "";
                        return { ...cell, value: isNum ? numVal : raw };
                    }
                    return cell;
                }),
            })),
        }));

        return { ...basePreviewData, sheets };
    }, [basePreviewData, customSheets, cellOverrides]);

    const handleChange = useCallback((next: EstimatorAnswers) => {
        setAnswers(next);
    }, []);

    const handleCellEdit = useCallback((sheetIndex: number, rowIndex: number, colIndex: number, newValue: string) => {
        const key = `${sheetIndex}-${rowIndex}-${colIndex}`;
        setCellOverrides(prev => ({ ...prev, [key]: newValue }));
    }, []);

    const handleAddSheet = useCallback(() => {
        const idx = customSheets.length;
        const color = SHEET_COLORS[idx % SHEET_COLORS.length];
        const newSheet: SheetTab = {
            name: `Sheet ${basePreviewData.sheets.length + idx + 1}`,
            color,
            columns: ["A", "B", "C", "D", "E"],
            rows: Array.from({ length: 20 }, () => ({
                cells: Array.from({ length: 5 }, () => ({ value: "" })),
            })),
        };
        setCustomSheets(prev => [...prev, newSheet]);
    }, [customSheets.length, basePreviewData.sheets.length]);

    const handleExport = useCallback(async () => {
        if (previewData.sheets.length === 0) return;
        setExporting(true);
        try {
            const blob = await exportEstimatorExcel(previewData);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = previewData.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error:", err);
            alert(`Export failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setExporting(false);
        }
    }, [previewData]);

    const handleComplete = useCallback(() => {
        // Questions finished — nothing extra to do, user sees the complete state
    }, []);

    // Active display index for vendor panel (use first display or 0)
    const activeDisplayIndex = Math.max(0, answers.displays.length - 1);

    const handleVendorApply = useCallback((fields: Partial<DisplayAnswers>, vendorSpec: VendorExtractedSpec) => {
        const next = { ...answers };
        const idx = activeDisplayIndex;
        if (idx >= 0 && idx < next.displays.length) {
            next.displays = [...next.displays];
            next.displays[idx] = { ...next.displays[idx], ...fields };
        }
        setAnswers(next);
        setVendorOpen(false);
    }, [answers, activeDisplayIndex]);

    const handleBundleToggle = useCallback((displayIndex: number, itemId: string) => {
        setAnswers((prev) => {
            const next = { ...prev, displays: [...prev.displays] };
            const d = { ...next.displays[displayIndex] };
            const excluded = d.excludedBundleItems || [];
            if (excluded.includes(itemId)) {
                d.excludedBundleItems = excluded.filter((id) => id !== itemId);
            } else {
                d.excludedBundleItems = [...excluded, itemId];
            }
            next.displays[displayIndex] = d;
            return next;
        });
    }, []);

    const handleConvert = useCallback(async () => {
        if (!projectId || converting) return;
        if (!confirm("Convert this estimate to a full Intelligence Mode proposal? This will create screens from your displays.")) return;
        setConverting(true);
        try {
            const res = await fetch("/api/estimator/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Conversion failed");
            }
            const data = await res.json();
            router.push(`/projects/${data.projectId}`);
        } catch (err) {
            alert(`Conversion failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setConverting(false);
        }
    }, [projectId, converting, router]);

    const handleDuplicate = useCallback(async () => {
        if (!projectId || duplicating) return;
        setDuplicating(true);
        try {
            const res = await fetch("/api/estimator/duplicate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Duplication failed");
            }
            const data = await res.json();
            router.push(`/estimator/${data.projectId}`);
        } catch (err) {
            alert(`Duplicate failed: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setDuplicating(false);
        }
    }, [projectId, duplicating, router]);

    return (
        <div className="h-[100dvh] w-full min-w-0 overflow-hidden flex flex-col bg-background text-foreground">
            {/* Header */}
            <header className="h-14 shrink-0 border-b border-border bg-background/95 backdrop-blur-md flex items-center px-4 gap-4 z-30 sticky top-0">
                <Link
                    href="/projects"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Projects
                </Link>
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#0A52EF]" />
                    <span className="text-sm font-semibold">
                        {answers.projectName || "New Estimate"}
                    </span>
                    {answers.clientName && (
                        <span className="text-xs text-muted-foreground">
                            — {answers.clientName}
                        </span>
                    )}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {ratesLoading && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Loading rates...
                        </span>
                    )}
                    {projectId && saveStatus === "saving" && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Saving...
                        </span>
                    )}
                    {projectId && saveStatus === "saved" && (
                        <span className="text-[10px] text-emerald-500">Saved</span>
                    )}
                    {projectId && saveStatus === "error" && (
                        <span className="text-[10px] text-destructive">Save failed</span>
                    )}
                    {answers.displays.length > 0 && (
                        <>
                            <span className="text-[10px] text-muted-foreground">
                                {answers.displays.length} display{answers.displays.length !== 1 ? "s" : ""}
                            </span>
                            <button
                                onClick={handleExport}
                                disabled={exporting}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A52EF] text-white rounded text-xs font-medium hover:bg-[#0A52EF]/90 transition-colors disabled:opacity-50"
                            >
                                <Download className="w-3 h-3" />
                                {exporting ? "Exporting..." : "Export .xlsx"}
                            </button>
                        </>
                    )}
                    {projectId && answers.displays.length > 0 && (
                        <>
                            <button
                                onClick={handleDuplicate}
                                disabled={duplicating}
                                className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                title="Duplicate estimate"
                            >
                                <Copy className="w-3 h-3" />
                                {duplicating ? "..." : "Duplicate"}
                            </button>
                            <button
                                onClick={handleConvert}
                                disabled={converting}
                                className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                title="Convert to full proposal"
                            >
                                <ArrowRightLeft className="w-3 h-3" />
                                {converting ? "..." : "To Proposal"}
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setBundleOpen((v) => !v)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                            bundleOpen
                                ? "bg-orange-600 text-white"
                                : "border border-border text-muted-foreground hover:bg-muted"
                        }`}
                        title="Smart Assembly Bundle"
                    >
                        <Boxes className="w-3 h-3" />
                        Bundle
                    </button>
                    <button
                        onClick={() => setVendorOpen((v) => !v)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                            vendorOpen
                                ? "bg-purple-600 text-white"
                                : "border border-border text-muted-foreground hover:bg-muted"
                        }`}
                        title="Parse vendor spec sheet"
                    >
                        <Package className="w-3 h-3" />
                        Vendor
                    </button>
                    <button
                        onClick={() => setCopilotOpen((v) => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            copilotOpen
                                ? "bg-[#0055B3] text-white"
                                : "border border-border text-muted-foreground hover:bg-muted"
                        }`}
                        title="Toggle Lux copilot"
                    >
                        <MessageSquare className="w-3 h-3" />
                        Lux
                    </button>
                </div>
            </header>

            {/* Split screen */}
            <main className="flex-1 min-h-0 overflow-hidden grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {/* Left: Questions */}
                <section className="relative min-w-0 min-h-0 flex flex-col overflow-hidden bg-background border-r border-border">
                    <QuestionFlow
                        answers={answers}
                        onChange={handleChange}
                        onComplete={handleComplete}
                    />
                </section>

                {/* Right: Excel Preview + Copilot overlay */}
                <section className="relative min-w-0 min-h-0 bg-zinc-100 dark:bg-zinc-950 overflow-hidden flex flex-col p-3">
                    <ExcelPreview
                        data={previewData}
                        onExport={handleExport}
                        exporting={exporting}
                        editable={true}
                        onCellEdit={handleCellEdit}
                        onAddSheet={handleAddSheet}
                    />
                    <EstimatorCopilot
                        answers={answers}
                        calcs={calcs}
                        onUpdateAnswers={handleChange}
                        isOpen={copilotOpen}
                        onClose={() => setCopilotOpen(false)}
                    />
                    {/* Bundle panel overlay */}
                    {bundleOpen && (
                        <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm rounded-lg border border-border shadow-lg">
                            <BundlePanel
                                calcs={calcs}
                                displays={answers.displays}
                                onToggleItem={handleBundleToggle}
                                onClose={() => setBundleOpen(false)}
                            />
                        </div>
                    )}
                    {/* Vendor spec panel overlay */}
                    {vendorOpen && (
                        <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm rounded-lg border border-border shadow-lg">
                            <VendorDropZone
                                displayIndex={activeDisplayIndex}
                                currentDisplay={answers.displays[activeDisplayIndex] || { widthFt: 0, heightFt: 0 } as any}
                                onApplySpecs={handleVendorApply}
                                onClose={() => setVendorOpen(false)}
                            />
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
