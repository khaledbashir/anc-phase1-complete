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
import { FileSpreadsheet, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import QuestionFlow from "./QuestionFlow";
import ExcelPreview from "./ExcelPreview";
import { buildPreviewSheets, type ExcelPreviewData } from "./EstimatorBridge";
import { getDefaultAnswers, type EstimatorAnswers } from "./questions";

export default function EstimatorStudio() {
    const [answers, setAnswers] = useState<EstimatorAnswers>(getDefaultAnswers());
    const [exporting, setExporting] = useState(false);

    // Build preview data reactively from answers
    const previewData: ExcelPreviewData = useMemo(() => {
        return buildPreviewSheets(answers);
    }, [answers]);

    const handleChange = useCallback((next: EstimatorAnswers) => {
        setAnswers(next);
    }, []);

    const handleExport = useCallback(async () => {
        if (answers.displays.length === 0) return;
        setExporting(true);
        try {
            // Build ScreenInput array for the server-side Excel generator
            const screens = answers.displays.map((d) => ({
                name: d.displayName || "Unnamed Display",
                widthFt: d.widthFt,
                heightFt: d.heightFt,
                pitchMm: parseFloat(d.pixelPitch) || 4,
                costPerSqFt: answers.costPerSqFtOverride > 0 ? answers.costPerSqFtOverride : undefined,
                desiredMargin: (answers.defaultMargin || 30) / 100,
                serviceType: d.serviceType,
                isReplacement: d.isReplacement,
                useExistingStructure: d.useExistingStructure,
                includeSpareParts: d.includeSpareParts,
                quantity: 1,
            }));

            const payload = {
                details: {
                    proposalId: answers.projectName || "Estimate",
                    proposalDate: new Date().toLocaleDateString(),
                    status: "DRAFT",
                    screens,
                },
                receiver: {
                    name: answers.clientName || "Client",
                },
            };

            const res = await fetch("/api/proposals/export?format=xlsx", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Export failed: ${errText}`);
            }

            const blob = await res.blob();
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
    }, [answers, previewData.fileName]);

    const handleComplete = useCallback(() => {
        // Questions finished — nothing extra to do, user sees the complete state
    }, []);

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

                {/* Right: Excel Preview */}
                <section className="relative min-w-0 min-h-0 bg-zinc-100 dark:bg-zinc-950 overflow-hidden flex flex-col p-3">
                    <ExcelPreview
                        data={previewData}
                        onExport={handleExport}
                        exporting={exporting}
                    />
                </section>
            </main>
        </div>
    );
}
