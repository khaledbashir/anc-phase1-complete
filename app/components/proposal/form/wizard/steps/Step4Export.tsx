"use client";

import { useEffect, useMemo, useState } from "react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { useFormContext } from "react-hook-form";
import {
    Eye,
    CheckCircle2,
    Clock,
    ArrowLeft,
    FileSpreadsheet,
    Shield,
    AlertTriangle,
    Zap,
    Download,
    Lock,
    Play,
    Pause,
    RefreshCw,
    Columns
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BaseButton } from "@/app/components";
import { formatCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExcelViewer from "@/app/components/ExcelViewer";
import type { ProposalType } from "@/types";

const Step4Export = () => {
    const {
        downloadPdf,
        previewPdfInTab,
        exportAudit,
        pdfUrl,
        proposalPdfLoading,
        generatePdf,
        excelPreview,
        excelSourceData,
        verificationManifest,
        verificationExceptions,
    } = useProposalContext();
    const { watch, getValues } = useFormContext<ProposalType>();
    const [exporting, setExporting] = useState(false);
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [verificationResponse, setVerificationResponse] = useState<any | null>(null);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [focusedRow, setFocusedRow] = useState<number | null>(null);
    const [playIndex, setPlayIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);

    // Get proposal data
    const screens = watch("details.screens") || [];
    const internalAudit = watch("details.internalAudit");
    const proposalName = watch("details.proposalName") || "Untitled Proposal";
    const proposalId = watch("details.proposalId");
    const totalValue = internalAudit?.totals?.finalClientTotal || 0;
    const lastSaved = watch("details.updatedAt");
    const mirrorMode = watch("details.mirrorMode");

    const screenCount = screens.length;
    const hasErrors = screens.some((s: any) => !s.widthFt || !s.heightFt || !s.name);
    const allScreensValid = screenCount > 0 && !hasErrors;
    const hasOptionPlaceholder = screens.some((s: any) => {
        const name = (s?.name ?? "").toString().trim().toUpperCase();
        const w = Number(s?.widthFt ?? s?.width ?? 0);
        const h = Number(s?.heightFt ?? s?.height ?? 0);
        return name.includes("OPTION") && (w <= 0 || h <= 0);
    });

    const effectiveVerification = verificationResponse?.verification ?? null;
    const effectiveManifest = effectiveVerification?.manifest ?? verificationManifest ?? null;
    const effectiveExceptions = effectiveVerification?.exceptions ?? verificationExceptions ?? [];
    const effectiveReport = effectiveVerification?.report ?? null;
    const reconciliation = effectiveManifest?.reconciliation ?? null;

    const mirrorBlockingIssues = useMemo(() => {
        const issues: Array<{ id: string; label: string }> = [];
        if (!excelPreview) issues.push({ id: "no-excel", label: "No Excel imported" });
        if (excelPreview && !excelSourceData) issues.push({ id: "no-excel-source", label: "Excel source data missing" });
        if (excelPreview && !allScreensValid) issues.push({ id: "invalid-screens", label: "Screens have missing dimensions" });
        if (hasOptionPlaceholder) issues.push({ id: "option-row", label: "OPTION placeholder row detected" });
        if (!internalAudit) issues.push({ id: "no-audit", label: "Internal audit not computed" });
        const rec = reconciliation;
        if (!rec) issues.push({ id: "no-reconciliation", label: "Verification not run" });
        if (rec && rec.isMatch === false) issues.push({ id: "variance", label: "Totals do not match Excel" });
        if (effectiveExceptions.length > 0) issues.push({ id: "exceptions", label: `${effectiveExceptions.length} exceptions found` });
        return issues;
    }, [allScreensValid, effectiveExceptions.length, excelPreview, excelSourceData, hasOptionPlaceholder, internalAudit, reconciliation]);

    const isMirrorReadyToExport = mirrorBlockingIssues.length === 0;

    const handleGlobalExport = async () => {
        if (mirrorMode && !isMirrorReadyToExport) return;
        setExporting(true);
        try {
            // Trigger both exports as requested
            await downloadPdf();
            await exportAudit();
        } finally {
            setTimeout(() => setExporting(false), 2000);
        }
    };

    const ensurePdfPreview = async () => {
        if (proposalPdfLoading) return;
        if (pdfUrl) return;
        await generatePdf(getValues());
    };

    const runVerification = async () => {
        if (!proposalId) {
            setVerificationError("Missing proposalId");
            return;
        }
        if (!excelSourceData) {
            setVerificationError("No Excel source data found. Import an ANC Excel first.");
            return;
        }
        if (!internalAudit) {
            setVerificationError("No internal audit found. Complete screen calculations first.");
            return;
        }
        setVerificationError(null);
        setVerificationLoading(true);
        try {
            const excelData = {
                ...excelSourceData,
                proposalId,
                fileName: excelPreview?.fileName || excelSourceData.fileName,
            };
            const res = await fetch("/api/proposals/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    proposalId,
                    excelData,
                    internalAudit,
                    options: { enableAutoFix: true },
                }),
            });
            if (!res.ok) {
                throw new Error(await res.text());
            }
            const data = await res.json();
            setVerificationResponse(data);
        } catch (e) {
            setVerificationResponse(null);
            setVerificationError(e instanceof Error ? e.message : "Verification failed");
        } finally {
            setVerificationLoading(false);
        }
    };

    const playbackItems = useMemo(() => {
        const manifest = effectiveManifest;
        if (!manifest?.perScreen || !Array.isArray(manifest.perScreen)) return [];

        const perScreen = manifest.perScreen;
        const needsAttention = perScreen
            .map((s: any) => {
                const variance = Number(s?.variance?.finalTotal ?? 0);
                const absVariance = Math.abs(variance);
                return { screen: s, absVariance, variance };
            })
            .filter((x: any) => x.absVariance > 0.01)
            .sort((a: any, b: any) => b.absVariance - a.absVariance);

        const items = needsAttention.length > 0 ? needsAttention : perScreen.map((screen: any) => ({ screen, absVariance: 0, variance: 0 }));
        return items.map((x: any) => ({
            name: x.screen?.name ?? "Unnamed Screen",
            rowIndex: Number(x.screen?.rowIndex ?? 0),
            variance: x.variance,
            absVariance: x.absVariance,
        }));
    }, [effectiveManifest]);

    const highlightedRows = useMemo(() => {
        if (playIndex < 0 || playIndex >= playbackItems.length) return [];
        const rowIndex1 = playbackItems[playIndex]?.rowIndex;
        if (!rowIndex1 || !Number.isFinite(rowIndex1)) return [];
        return [rowIndex1 - 1];
    }, [playIndex, playbackItems]);

    useEffect(() => {
        if (!isPlaying) return;
        if (playbackItems.length === 0) return;
        const t = setTimeout(() => {
            setPlayIndex((prev) => {
                const next = prev < 0 ? 0 : prev + 1;
                if (next >= playbackItems.length) {
                    setIsPlaying(false);
                    return prev;
                }
                return next;
            });
        }, 900);
        return () => clearTimeout(t);
    }, [isPlaying, playbackItems.length, playIndex]);

    useEffect(() => {
        if (highlightedRows.length === 0) return;
        setFocusedRow(highlightedRows[0]);
    }, [highlightedRows]);

    return (
        <div className="h-full flex flex-col p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Phase 4 Header */}
            <div className="flex flex-col items-center text-center mb-12">
                <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-6 relative group">
                    <div className="absolute inset-0 bg-brand-blue/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                    <Zap className="w-8 h-8 text-brand-blue relative z-10" />
                </div>
                
                <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Validation & Final Export</h2>
                <p className="text-zinc-500 text-sm max-w-md font-medium">
                    Review your strategic analysis and generate professional-grade project artifacts.
                </p>
            </div>

            {mirrorMode && (
                <Card className="bg-zinc-900/40 border border-zinc-800/60 overflow-hidden mb-10">
                    <CardHeader className="border-b border-zinc-800/60">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">
                                    Mirror Mode Flight Checklist
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">
                                    Export unlocks only when all gates pass (Master Truth).
                                </CardDescription>
                            </div>
                            <div className={cn(
                                "shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest",
                                isMirrorReadyToExport
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                            )}>
                                {isMirrorReadyToExport ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                {isMirrorReadyToExport ? "Good To Go" : "Blocked"}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className={cn(
                                "rounded-xl border px-4 py-3",
                                excelPreview && excelSourceData ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/30"
                            )}>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">1) Ingest</div>
                                <div className="mt-2 text-sm font-semibold text-white">Excel Imported</div>
                                <div className="mt-1 text-[11px] text-zinc-500">
                                    {excelPreview?.fileName ? excelPreview.fileName : "Upload estimator Excel"}
                                </div>
                            </div>
                            <div className={cn(
                                "rounded-xl border px-4 py-3",
                                allScreensValid && !hasOptionPlaceholder ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/30"
                            )}>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">2) Populate</div>
                                <div className="mt-2 text-sm font-semibold text-white">Screens Valid</div>
                                <div className="mt-1 text-[11px] text-zinc-500">
                                    {hasOptionPlaceholder ? "OPTION row detected" : `${screenCount} screens`}
                                </div>
                            </div>
                            <div className={cn(
                                "rounded-xl border px-4 py-3",
                                internalAudit ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/30"
                            )}>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">3) Audit</div>
                                <div className="mt-2 text-sm font-semibold text-white">Math Ready</div>
                                <div className="mt-1 text-[11px] text-zinc-500">
                                    {internalAudit?.totals?.finalClientTotal ? formatCurrency(Number(internalAudit.totals.finalClientTotal)) : "Compute internal audit"}
                                </div>
                            </div>
                            <div className={cn(
                                "rounded-xl border px-4 py-3",
                                isMirrorReadyToExport ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/30"
                            )}>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">4) Export</div>
                                <div className="mt-2 text-sm font-semibold text-white">Verified</div>
                                <div className="mt-1 text-[11px] text-zinc-500">
                                    {reconciliation?.isMatch ? "Totals match Excel" : "Run verification"}
                                </div>
                            </div>
                        </div>

                        {!isMirrorReadyToExport && mirrorBlockingIssues.length > 0 && (
                            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-200">Blocked Because</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {mirrorBlockingIssues.slice(0, 6).map((it) => (
                                        <Badge key={it.id} variant="outline" className="text-[10px] border-amber-500/20 text-amber-200">
                                            {it.label}
                                        </Badge>
                                    ))}
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={runVerification}
                                        className={cn(
                                            "px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                                            verificationLoading
                                                ? "border-zinc-800 bg-zinc-950/40 text-zinc-500 cursor-not-allowed"
                                                : "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
                                        )}
                                    >
                                        {verificationLoading ? "Verifying…" : <span className="inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" />Run Verification</span>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={ensurePdfPreview}
                                        className={cn(
                                            "px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                                            proposalPdfLoading
                                                ? "border-zinc-800 bg-zinc-950/40 text-zinc-500 cursor-not-allowed"
                                                : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-brand-blue/40 hover:text-white"
                                        )}
                                    >
                                        {proposalPdfLoading ? "Generating…" : pdfUrl ? "PDF Ready" : "Generate PDF Preview"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Left Column: Summary & Status */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden relative">
                        {/* 55° Slash Decorative Pattern */}
                        <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none overflow-hidden">
                            <div className="absolute top-0 right-0 w-full h-full transform rotate-[55deg] translate-x-8 -translate-y-8 bg-gradient-to-b from-brand-blue to-transparent" />
                        </div>

                        <CardHeader className="pb-4">
                            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">Project Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1 truncate">{proposalName}</h3>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-400 font-bold uppercase tracking-widest">
                                        {screenCount} Screens
                                    </Badge>
                                    <Badge className="bg-brand-blue/10 text-brand-blue border-none text-[10px] font-bold uppercase tracking-widest">
                                        {formatCurrency(totalValue)}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-500 font-medium">Calculation Mode</span>
                                    <span className="text-zinc-300 font-bold">{mirrorMode ? "Mirror Mode" : "Strategic AI"}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-zinc-500 font-medium">Data Integrity</span>
                                    {allScreensValid ? (
                                        <span className="text-emerald-500 font-bold flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> Verified
                                        </span>
                                    ) : (
                                        <span className="text-amber-500 font-bold flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Issues Found
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800 flex items-center gap-3">
                        <Clock className="w-4 h-4 text-zinc-600" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Last Vault Sync</span>
                        <span className="text-xs text-zinc-400 font-medium">{lastSaved ? new Date(lastSaved as any).toLocaleString() : "Pending sync..."}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Global Export Action */}
                <div className="lg:col-span-2 space-y-6">
                    {/* The Global Export Button - Primary Call to Action */}
                    <div 
                        onClick={(mirrorMode ? isMirrorReadyToExport : allScreensValid) ? handleGlobalExport : undefined}
                        className={cn(
                            "group relative overflow-hidden rounded-3xl p-10 transition-all duration-500",
                            (mirrorMode ? isMirrorReadyToExport : allScreensValid) 
                                ? "bg-brand-blue cursor-pointer hover:shadow-[0_0_40px_rgba(10,82,239,0.3)] hover:-translate-y-1" 
                                : "bg-zinc-800/50 cursor-not-allowed opacity-60"
                        )}
                    >
                        {/* 55° Slash Pattern for Brand Consistency */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                            {[...Array(6)].map((_, i) => (
                                <div 
                                    key={i}
                                    className="absolute h-[200%] w-px bg-white transform rotate-[55deg]"
                                    style={{ left: `${i * 20}%`, top: '-50%' }}
                                />
                            ))}
                        </div>

                        <div className="relative z-10 flex flex-col items-center text-center gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform duration-500">
                                {exporting ? (
                                    <Zap className="w-10 h-10 text-white animate-pulse" />
                                ) : (
                                    <Download className="w-10 h-10 text-white" />
                                )}
                            </div>
                            
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Global Export Bundle</h3>
                                <p className="text-white/70 text-sm max-w-sm mx-auto font-medium leading-relaxed">
                                    Generates both the <span className="text-white font-bold">Client-Facing PDF</span> and the <span className="text-white font-bold">Internal Audit Excel</span> in a single operation.
                                </p>
                            </div>

                            {!(mirrorMode ? isMirrorReadyToExport : allScreensValid) && (
                                <div className="mt-2 px-4 py-2 bg-black/20 backdrop-blur-sm rounded-lg text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <Lock className="w-3 h-3" /> Resolve Gates To Unlock
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Secondary Artifact Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                            onClick={previewPdfInTab}
                            className="flex items-center justify-between p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-brand-blue/50 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-zinc-800 text-zinc-400 group-hover:text-brand-blue transition-colors">
                                    <Eye className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-sm font-bold text-white">Live PDF Preview</h4>
                                    <p className="text-[10px] text-zinc-500 font-medium">Verify layout before export</p>
                                </div>
                            </div>
                            <ArrowLeft className="w-4 h-4 text-zinc-700 group-hover:text-brand-blue rotate-180 transition-all" />
                        </button>

                        <button 
                            onClick={exportAudit}
                            disabled={mirrorMode && !isMirrorReadyToExport}
                            className={cn(
                                "flex items-center justify-between p-5 bg-zinc-900 border rounded-2xl transition-all group",
                                mirrorMode && !isMirrorReadyToExport
                                    ? "border-zinc-800 opacity-60 cursor-not-allowed"
                                    : "border-zinc-800 hover:border-emerald-500/50"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-zinc-800 text-zinc-400 group-hover:text-emerald-500 transition-colors">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-sm font-bold text-white">Audit Security Blanket</h4>
                                    <p className="text-[10px] text-zinc-500 font-medium">Internal audit workbook (Master Truth)</p>
                                </div>
                            </div>
                            <ArrowLeft className="w-4 h-4 text-zinc-700 group-hover:text-emerald-500 rotate-180 transition-all" />
                        </button>
                    </div>
                </div>
            </div>

            <Card className="bg-zinc-900/40 border border-zinc-800/60 overflow-hidden">
                <CardHeader className="border-b border-zinc-800/60">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                <Columns className="w-4 h-4 text-brand-blue" />
                                Verification Studio
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Review Excel vs PDF and watch verification scan screen-by-screen.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={ensurePdfPreview}
                                disabled={mirrorMode && !allScreensValid}
                                className={cn(
                                    "px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                                    (proposalPdfLoading || (mirrorMode && !allScreensValid))
                                        ? "border-zinc-800 bg-zinc-950/40 text-zinc-500 cursor-not-allowed"
                                        : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-brand-blue/40 hover:text-white"
                                )}
                            >
                                {proposalPdfLoading ? "Generating…" : pdfUrl ? "PDF Ready" : "Generate PDF Preview"}
                            </button>
                            <button
                                type="button"
                                onClick={runVerification}
                                disabled={mirrorMode && (hasOptionPlaceholder || !allScreensValid)}
                                className={cn(
                                    "px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                                    (verificationLoading || (mirrorMode && (hasOptionPlaceholder || !allScreensValid)))
                                        ? "border-zinc-800 bg-zinc-950/40 text-zinc-500 cursor-not-allowed"
                                        : "border-brand-blue/40 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/15"
                                )}
                            >
                                {verificationLoading ? "Verifying…" : <span className="inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" />Run Verification</span>}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isPlaying) {
                                        setIsPlaying(false);
                                        return;
                                    }
                                    setPlayIndex(-1);
                                    setIsPlaying(true);
                                }}
                                disabled={playbackItems.length === 0}
                                className={cn(
                                    "px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                                    playbackItems.length === 0
                                        ? "border-zinc-800 bg-zinc-950/40 text-zinc-600 cursor-not-allowed"
                                        : isPlaying
                                            ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
                                            : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-amber-500/40 hover:text-white"
                                )}
                            >
                                {isPlaying ? <span className="inline-flex items-center gap-2"><Pause className="w-4 h-4" />Pause</span> : <span className="inline-flex items-center gap-2"><Play className="w-4 h-4" />Play Scan</span>}
                            </button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <Tabs defaultValue="studio">
                        <TabsList className="bg-zinc-950/40">
                            <TabsTrigger value="studio">Side-by-side</TabsTrigger>
                            <TabsTrigger value="results">Results</TabsTrigger>
                        </TabsList>

                        <TabsContent value="studio" className="mt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="h-[520px] max-h-[65vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/30">
                                    <ExcelViewer
                                        highlightedRows={highlightedRows}
                                        focusedRow={focusedRow}
                                        onFocusedRowChange={setFocusedRow}
                                    />
                                </div>
                                <div className="h-[520px] max-h-[65vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/30 flex flex-col">
                                    <div className="shrink-0 px-3 py-2 border-b border-zinc-800/70 flex items-center justify-between">
                                        <div className="text-[11px] font-semibold text-zinc-300 uppercase tracking-widest">Client PDF</div>
                                        <button
                                            type="button"
                                            onClick={previewPdfInTab}
                                            className="text-[11px] font-bold text-brand-blue hover:text-brand-blue/90"
                                        >
                                            Open
                                        </button>
                                    </div>
                                    <div className="flex-1">
                                        {pdfUrl ? (
                                            <iframe
                                                title="Proposal PDF Preview"
                                                src={pdfUrl}
                                                className="w-full h-full"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-zinc-600 text-sm">
                                                Generate a PDF preview to view it here.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {playIndex >= 0 && playIndex < playbackItems.length && (
                                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-white truncate">
                                            Scanning: {playbackItems[playIndex]?.name}
                                        </div>
                                        <div className="text-[11px] text-zinc-500">
                                            Excel row {Number(playbackItems[playIndex]?.rowIndex || 0)} • Variance {formatCurrency(Number(playbackItems[playIndex]?.variance || 0))}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                        {playIndex + 1}/{playbackItems.length}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="results" className="mt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-1 space-y-3">
                                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Reconciliation</div>
                                        {reconciliation ? (
                                            <div className="mt-2 space-y-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-zinc-500">Excel Total</span>
                                                    <span className="text-zinc-200 font-bold">{formatCurrency(reconciliation.sourceFinalTotal)}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-zinc-500">Natalia Total</span>
                                                    <span className="text-zinc-200 font-bold">{formatCurrency(reconciliation.calculatedFinalTotal)}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-zinc-500">Variance</span>
                                                    <span className={cn("font-bold", reconciliation.isMatch ? "text-emerald-400" : "text-amber-300")}>
                                                        {formatCurrency(reconciliation.variance)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-zinc-500">Match</span>
                                                    <span className={cn("font-bold", reconciliation.isMatch ? "text-emerald-400" : "text-amber-300")}>
                                                        {reconciliation.matchType}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-2 text-xs text-zinc-600">Run verification to populate totals.</div>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Exceptions</div>
                                        <div className="mt-2 text-xs text-zinc-400 font-semibold">
                                            {effectiveExceptions.length} found
                                        </div>
                                    </div>

                                    {verificationError && (
                                        <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-xs text-red-200">
                                            {verificationError}
                                        </div>
                                    )}
                                </div>

                                <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-zinc-800/70 flex items-center justify-between">
                                        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Findings</div>
                                        {effectiveReport?.status && (
                                            <div className={cn(
                                                "text-[10px] font-bold uppercase tracking-widest",
                                                effectiveReport.status === "VERIFIED"
                                                    ? "text-emerald-400"
                                                    : effectiveReport.status === "WARNING"
                                                        ? "text-amber-300"
                                                        : "text-red-400"
                                            )}>
                                                {effectiveReport.status}
                                            </div>
                                        )}
                                    </div>

                                    <div className="max-h-[360px] overflow-auto custom-scrollbar">
                                        {playbackItems.length === 0 ? (
                                            <div className="px-4 py-6 text-sm text-zinc-600">No per-screen data available yet.</div>
                                        ) : (
                                            <div className="divide-y divide-zinc-800/60">
                                                {playbackItems.slice(0, 50).map((it: any, idx: number) => {
                                                    const variance = Number(it.variance || 0);
                                                    const row = Number(it.rowIndex || 0);
                                                    return (
                                                        <button
                                                            key={`${it.name}-${idx}`}
                                                            type="button"
                                                            onClick={() => {
                                                                setIsPlaying(false);
                                                                setPlayIndex(idx);
                                                                if (row) setFocusedRow(row - 1);
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-zinc-900/40 transition-colors"
                                                        >
                                                            <div className="flex items-center justify-between gap-4">
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-semibold text-white truncate">{it.name}</div>
                                                                    <div className="text-[11px] text-zinc-500">Excel row {row || "—"}</div>
                                                                </div>
                                                                <div className={cn(
                                                                    "text-xs font-bold",
                                                                    Math.abs(variance) <= 0.01 ? "text-emerald-400" : "text-amber-300"
                                                                )}>
                                                                    {formatCurrency(variance)}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Support Footer */}
            <div className="mt-auto pt-8 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-zinc-600" />
                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">ANC Identity Protection System Active</span>
                </div>
                <div className="text-[10px] font-medium text-zinc-600">
                    For branding approvals, contact <span className="text-zinc-500 underline">alison@anc.com</span>
                </div>
            </div>
        </div>
    );
};

export default Step4Export;
