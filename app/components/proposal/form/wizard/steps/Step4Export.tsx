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
    Columns,
    MessageSquare,
    Check
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
        generatePdf,
        downloadPdf,
        previewPdfInTab,
        exportAudit,
        pdfUrl,
        proposalPdfLoading,
        excelPreview,
        excelSourceData,
        verificationManifest,
        verificationExceptions,
        isGatekeeperLocked,
        unverifiedAiFields,
    } = useProposalContext();
    const { watch, getValues, setValue } = useFormContext<ProposalType>();
    const [exporting, setExporting] = useState(false);
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [verificationResponse, setVerificationResponse] = useState<any | null>(null);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [focusedRow, setFocusedRow] = useState<number | null>(null);
    const [playIndex, setPlayIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [changeRequestsLoading, setChangeRequestsLoading] = useState(false);
    const [changeRequests, setChangeRequests] = useState<any[]>([]);

    // Get proposal data
    const screens = watch("details.screens") || [];
    const internalAudit = watch("details.internalAudit");
    const proposalName = watch("details.proposalName") || "Untitled Proposal";
    const proposalId = watch("details.proposalId");
    const totalValue = internalAudit?.totals?.finalClientTotal || 0;
    const lastSaved = watch("details.updatedAt");
    const mirrorMode = watch("details.mirrorMode");

    useEffect(() => {
        if (!proposalId) return;
        let cancelled = false;
        (async () => {
            try {
                setChangeRequestsLoading(true);
                const res = await fetch(`/api/projects/${proposalId}/change-requests`, { cache: "no-store" as any });
                const json = await res.json().catch(() => null);
                if (cancelled) return;
                setChangeRequests(Array.isArray(json?.items) ? json.items : []);
            } catch {
            } finally {
                if (!cancelled) setChangeRequestsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [proposalId]);

    const updateChangeRequestStatus = async (requestId: string, status: "OPEN" | "RESOLVED") => {
        if (!proposalId) return;
        const res = await fetch(`/api/projects/${proposalId}/change-requests`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId, status, resolvedBy: "natalia" }),
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => null);
        const updated = json?.item;
        if (!updated?.id) return;
        setChangeRequests((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    };

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
        if (effectiveExceptions.length > 0) {
            const criticalExceptions = effectiveExceptions.filter((ex: any) =>
                ex.severity === 'CRITICAL' || ex.category === 'DATA_INTEGRITY'
            );
            if (criticalExceptions.length > 0) {
                issues.push({ id: "exceptions", label: `${criticalExceptions.length} critical exceptions found` });
            }
        }
        if (isGatekeeperLocked) {
            issues.push({ id: "gatekeeper", label: `Unverified AI Data (${unverifiedAiFields.length})` });
        }
        return issues;
    }, [allScreensValid, effectiveExceptions, excelPreview, excelSourceData, hasOptionPlaceholder, internalAudit, reconciliation, isGatekeeperLocked, unverifiedAiFields]);

    const isMirrorReadyToExport = mirrorBlockingIssues.length === 0;
    const isPdfPreviewBlocked = mirrorMode
        ? !allScreensValid || hasOptionPlaceholder || !internalAudit || isGatekeeperLocked
        : !allScreensValid || isGatekeeperLocked;

    const handleGlobalExport = async () => {
        const isBlocked = mirrorMode ? !isMirrorReadyToExport : (!allScreensValid || isGatekeeperLocked);
        if (isBlocked) return;
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

    const canRunVerification = !!(proposalId && excelSourceData && internalAudit);

    const runVerification = async () => {
        if (!proposalId) {
            setVerificationError("Save the project first to enable verification.");
            return;
        }
        if (!excelSourceData) {
            setVerificationError("Import an Estimator Excel file first (Setup step).");
            return;
        }
        if (!internalAudit) {
            setVerificationError("Add screens with dimensions first (Configure step).");
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
        <TooltipProvider>
            <div className="h-full flex flex-col p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Phase 4 Header */}
                <div className="flex flex-col items-center text-center mb-12">
                    <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-6 relative group">
                        <div className="absolute inset-0 bg-brand-blue/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                        <Zap className="w-8 h-8 text-brand-blue relative z-10" />
                    </div>

                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Review & Export</h2>
                    <p className="text-zinc-500 text-sm max-w-md font-medium">
                        Final review of your proposal. Verify data accuracy and export professional documents.
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

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    reconciliation?.isMatch ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Layer 1</div>
                                    <div className="mt-2 text-sm font-semibold text-white">Excel ↔ Audit</div>
                                    <div className="mt-1 text-[11px] text-zinc-500">
                                        {reconciliation?.isMatch ? "Match" : "Not verified"}
                                    </div>
                                </div>
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    pdfUrl && internalAudit ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Layer 2</div>
                                    <div className="mt-2 text-sm font-semibold text-white">PDF ↔ Internal Audit</div>
                                    <div className="mt-1 text-[11px] text-zinc-500">
                                        {pdfUrl && internalAudit ? "Ready" : "Generate PDF + Audit"}
                                    </div>
                                </div>
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    effectiveVerification?.roundingCompliance?.isCompliant ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Layer 3</div>
                                    <div className="mt-2 text-sm font-semibold text-white">Rounding</div>
                                    <div className="mt-1 text-[11px] text-zinc-500">
                                        {effectiveVerification?.roundingCompliance?.isCompliant ? "Compliant" : "Not checked"}
                                    </div>
                                </div>
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    (playbackItems?.length ?? 0) > 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Layer 4</div>
                                    <div className="mt-2 text-sm font-semibold text-white">Line‑By‑Line Scan</div>
                                    <div className="mt-1 text-[11px] text-zinc-500">
                                        {(playbackItems?.length ?? 0) > 0 ? "Available" : "Run verification"}
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
                                            <div className="flex flex-col items-end">
                                                <span className="text-amber-500 font-bold flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Issues Found
                                                </span>
                                                <span className="text-[10px] text-amber-500/70">
                                                    Check screen dimensions
                                                </span>
                                            </div>
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

                        {/* NATALIA GATEKEEPER ADVISORY - Moved to top for visibility */}
                        {isGatekeeperLocked && (
                            <Card className="border-brand-blue/30 bg-brand-blue/5 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <CardHeader className="py-4 bg-brand-blue/10 border-b border-brand-blue/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-brand-blue text-sm font-bold">
                                            <Shield className="w-4 h-4" />
                                            <span>NATALIA GATEKEEPER ACTIVE</span>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] bg-brand-blue/20 border-brand-blue/30 text-brand-blue animate-pulse">
                                            {unverifiedAiFields.length} VERIFICATIONS PENDING
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-brand-blue/70 shrink-0 mt-0.5" />
                                        <p className="text-xs text-zinc-400 leading-relaxed">
                                            Export capabilities are currently locked. The "Trust but Verify" mandate requires manual confirmation of all AI-generated fields before client release.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pl-8">
                                        {unverifiedAiFields.slice(0, 4).map(field => (
                                            <div key={field} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                                                {field.split('.').pop()?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                            </div>
                                        ))}
                                        {unverifiedAiFields.length > 4 && (
                                            <div className="flex items-center justify-center p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-[10px] text-zinc-500 font-bold">
                                                +{unverifiedAiFields.length - 4} MORE
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* PDF Configuration Toggles */}
                        <Card className="bg-zinc-900/40 border border-zinc-800/60 overflow-hidden mb-6">
                            <CardHeader className="border-b border-zinc-800/60 pb-3">
                                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                    <Columns className="w-4 h-4 text-brand-blue" />
                                    PDF Layout Options
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">
                                    Control which sections appear in the client-facing PDF
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Intro Text</label>
                                        <p className="text-[10px] text-zinc-500">LOI/Budget/Proposal opening paragraph</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showIntroText") ?? true;
                                            setValue("details.showIntroText", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showIntroText") ?? true) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showIntroText") ?? true) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Base Bid Table</label>
                                        <p className="text-[10px] text-zinc-500">Project Total table on page one</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showBaseBidTable") ?? true;
                                            setValue("details.showBaseBidTable", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showBaseBidTable") ?? true) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showBaseBidTable") ?? true) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Specifications</label>
                                        <p className="text-[10px] text-zinc-500">Per-display specifications section</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showSpecifications") ?? true;
                                            setValue("details.showSpecifications", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showSpecifications") ?? true) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showSpecifications") ?? true) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Company Footer</label>
                                        <p className="text-[10px] text-zinc-500">ANC footer line at the end</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showCompanyFooter") ?? true;
                                            setValue("details.showCompanyFooter", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showCompanyFooter") ?? true) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showCompanyFooter") ?? true) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                {/* Exhibit A Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Exhibit A (Statement of Work)</label>
                                        <p className="text-[10px] text-zinc-500">Detailed scope of work and technical specifications</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showExhibitA") ?? false;
                                            setValue("details.showExhibitA", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showExhibitA") ?? false) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showExhibitA") ?? false) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                {/* Exhibit B Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Exhibit B (Cost Schedule)</label>
                                        <p className="text-[10px] text-zinc-500">Simplified cost breakdown table</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showExhibitB") ?? false;
                                            setValue("details.showExhibitB", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showExhibitB") ?? false) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showExhibitB") ?? false) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Pricing Tables</label>
                                        <p className="text-[10px] text-zinc-500">If off, PDF shows only Project Grand Total</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showPricingTables") ?? true;
                                            setValue("details.showPricingTables", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showPricingTables") ?? true) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showPricingTables") ?? true) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Detailed Per-Screen Breakdown</label>
                                        <p className="text-[10px] text-zinc-500">Per-screen cost breakdown (Structure, Install, Power, etc.)</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.includePricingBreakdown") ?? true;
                                            setValue("details.includePricingBreakdown", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.includePricingBreakdown") ?? true) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.includePricingBreakdown") ?? true) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                {/* Payment Terms Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Payment Terms</label>
                                        <p className="text-[10px] text-zinc-500">50% Deposit, 40% Delivery, 10% Acceptance</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showPaymentTerms") ?? true;
                                            setValue("details.showPaymentTerms", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showPaymentTerms") ?? true) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showPaymentTerms") ?? true) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                {/* Signature Block Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Signature Block</label>
                                        <p className="text-[10px] text-zinc-500">ANC + Purchaser authorization signatures</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showSignatureBlock") ?? true;
                                            setValue("details.showSignatureBlock", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showSignatureBlock") ?? true) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showSignatureBlock") ?? true) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                {/* Statement of Work Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Statement of Work</label>
                                        <p className="text-[10px] text-zinc-500">Physical installation, electrical, control system sections</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showExhibitA") ?? true;
                                            setValue("details.showExhibitA", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showExhibitA") ?? true) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showExhibitA") ?? true) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>

                                {/* Assumptions Toggle */}
                                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-zinc-300 block">Show Assumptions Text</label>
                                        <p className="text-[10px] text-zinc-500">Site access, power requirements, etc.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const current = watch("details.showAssumptions") ?? false;
                                            setValue("details.showAssumptions", !current, { shouldDirty: true, shouldTouch: true });
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            (watch("details.showAssumptions") ?? false) ? "bg-brand-blue" : "bg-zinc-700"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                (watch("details.showAssumptions") ?? false) ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Consolidated Export Suite */}
                        <Card className="bg-zinc-900/40 border border-zinc-800/60 overflow-hidden">
                            <CardHeader className="border-b border-zinc-800/60 pb-3">
                                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                    <Download className="w-4 h-4 text-brand-blue" />
                                    Export Suite
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="grid grid-cols-1 divide-y divide-zinc-800/60">
                                    {/* Primary Bundle Option */}
                                    <div className="p-4 flex items-center justify-between hover:bg-zinc-900/40 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center border border-brand-blue/20 group-hover:scale-110 transition-transform">
                                                <Zap className="w-5 h-5 text-brand-blue" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white group-hover:text-brand-blue transition-colors">Global Export Bundle</h4>
                                                <p className="text-[11px] text-zinc-500">Download Client PDF + Internal Audit Excel (Recommended)</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleGlobalExport}
                                            disabled={mirrorMode ? !isMirrorReadyToExport : (!allScreensValid || isGatekeeperLocked)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                                (mirrorMode ? !isMirrorReadyToExport : (!allScreensValid || isGatekeeperLocked))
                                                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                                    : "bg-brand-blue text-white hover:bg-brand-blue/90 shadow-[0_0_20px_rgba(10,82,239,0.3)] hover:shadow-[0_0_30px_rgba(10,82,239,0.5)]"
                                            )}
                                        >
                                            {exporting ? "Generating..." : "Download Bundle"}
                                            {!exporting && <Download className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>

                                    {/* Individual Options */}
                                    <div className="grid grid-cols-2 divide-x divide-zinc-800/60">
                                        <div className="p-4 flex items-center justify-between hover:bg-zinc-900/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400">
                                                    <FileSpreadsheet className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-zinc-300">Excel Only</div>
                                                    <div className="text-[10px] text-zinc-600">Audit Workbook</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={exportAudit}
                                                disabled={(mirrorMode && !isMirrorReadyToExport) || isGatekeeperLocked}
                                                className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="p-4 flex items-center justify-between hover:bg-zinc-900/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400">
                                                    <Eye className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-zinc-300">PDF Only</div>
                                                    <div className="text-[10px] text-zinc-600">Client Proposal</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={downloadPdf}
                                                disabled={mirrorMode ? isPdfPreviewBlocked : (!allScreensValid || isGatekeeperLocked)}
                                                className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900/40 border border-zinc-800/60 overflow-hidden">
                            <CardHeader className="border-b border-zinc-800/60 pb-3">
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-brand-blue" />
                                        Client Requests
                                    </CardTitle>
                                    <Badge className="bg-zinc-950/50 text-zinc-300 border border-zinc-800">
                                        {changeRequests.filter((r: any) => r.status === "OPEN").length} open
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                {changeRequestsLoading ? (
                                    <div className="text-xs text-zinc-600">Loading…</div>
                                ) : changeRequests.length === 0 ? (
                                    <div className="text-xs text-zinc-600">
                                        No client change requests yet. Share link clients can submit requests from the portal.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {changeRequests.slice(0, 6).map((r: any) => (
                                            <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-white truncate">
                                                            {r.requesterName}
                                                            {r.requesterEmail ? (
                                                                <span className="text-zinc-500 font-semibold"> • {r.requesterEmail}</span>
                                                            ) : null}
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-zinc-600">
                                                            {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 flex items-center gap-2">
                                                        {r.status === "RESOLVED" ? (
                                                            <Badge className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                                                Resolved
                                                            </Badge>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateChangeRequestStatus(r.id, "RESOLVED")}
                                                                className="px-3 py-2 rounded-xl text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15 transition-colors inline-flex items-center gap-2"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                                Mark Resolved
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-3 text-xs text-zinc-300 whitespace-pre-wrap">
                                                    {r.message}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
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
                                    onClick={previewPdfInTab}
                                    disabled={mirrorMode && isPdfPreviewBlocked}
                                    title={mirrorMode && isPdfPreviewBlocked ? "Complete verification first" : "Open PDF preview in new tab"}
                                    className={cn(
                                        "px-3 py-2 rounded-xl border text-xs font-bold transition-all inline-flex items-center gap-2",
                                        (proposalPdfLoading || (mirrorMode && isPdfPreviewBlocked))
                                            ? "border-zinc-800 bg-zinc-950/40 text-zinc-500 cursor-not-allowed"
                                            : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:border-brand-blue/40 hover:text-white"
                                    )}
                                >
                                    <Eye className="w-4 h-4" />
                                    {proposalPdfLoading ? "Generating…" : pdfUrl ? "Open Preview" : mirrorMode && isPdfPreviewBlocked ? "🔒 Blocked" : "Preview PDF"}
                                </button>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={runVerification}
                                            disabled={verificationLoading}
                                            className={cn(
                                                "px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                                                verificationLoading
                                                    ? "border-zinc-800 bg-zinc-950/40 text-zinc-500 cursor-not-allowed"
                                                    : !canRunVerification
                                                        ? "border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                                                        : "border-brand-blue/40 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/15"
                                            )}
                                        >
                                            {verificationLoading ? "Verifying…" : (
                                                <span className="inline-flex items-center gap-2">
                                                    {!canRunVerification ? <AlertTriangle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                                    {canRunVerification ? "Run Verification" : "Check Status"}
                                                </span>
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    {!canRunVerification && (
                                        <TooltipContent side="bottom" className="bg-zinc-800 border-zinc-700 text-white text-xs max-w-xs">
                                            Click to see what data is missing for verification.
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
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
                                    </TooltipTrigger>
                                    {playbackItems.length === 0 && (
                                        <TooltipContent side="bottom" className="bg-zinc-800 border-zinc-700 text-white text-xs">
                                            Run verification first to enable scan playback
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <Tabs defaultValue="studio">
                            <TabsList className="bg-zinc-950/40">
                                <TabsTrigger value="studio">Data Inspection</TabsTrigger>
                                <TabsTrigger value="results">Results</TabsTrigger>
                            </TabsList>

                            <TabsContent value="studio" className="mt-4">
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 overflow-hidden">
                                        <div className="shrink-0 px-4 py-3 border-b border-zinc-800/70 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Source</span>
                                                    <span className="text-xs font-semibold text-white">Excel Estimator</span>
                                                </div>
                                                <div className="h-4 w-px bg-zinc-800" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Output</span>
                                                    <span className="text-xs font-semibold text-brand-blue">Proposal PDF</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={previewPdfInTab}
                                                disabled={mirrorMode && isPdfPreviewBlocked}
                                                className={cn(
                                                    "text-[11px] font-bold text-brand-blue",
                                                    mirrorMode && isPdfPreviewBlocked ? "opacity-60 cursor-not-allowed" : "hover:text-brand-blue/90"
                                                )}
                                            >
                                                Open PDF
                                            </button>
                                        </div>
                                        <div className="h-[520px] max-h-[65vh] overflow-hidden">
                                            <ExcelViewer
                                                highlightedRows={highlightedRows}
                                                focusedRow={focusedRow}
                                                onFocusedRowChange={setFocusedRow}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-xs text-zinc-500">
                                        Use the live PDF preview on the right panel to compare against Excel.
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
        </TooltipProvider>
    );
};

export default Step4Export;
