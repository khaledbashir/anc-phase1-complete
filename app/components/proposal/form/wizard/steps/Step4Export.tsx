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
    Check,
    FileText,
    PenTool,
    DollarSign,
    Settings
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BaseButton } from "@/app/components";
import { formatCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExcelGridViewer from "@/app/components/ExcelGridViewer";
import type { ProposalType } from "@/types";

const Step4Export = () => {
    const {
        generatePdf,
        downloadPdf,
        downloadAllPdfVariants,
        previewPdfInTab,
        exportAudit,
        pdfUrl,
        proposalPdfLoading,
        pdfGenerationProgress,
        pdfBatchProgress,
        excelPreview,
        excelSourceData,
        verificationManifest,
        verificationExceptions,
        isGatekeeperLocked,
        unverifiedAiFields,
    } = useProposalContext();
    const { watch, getValues, setValue } = useFormContext<ProposalType>();
    const [exporting, setExporting] = useState(false);
    const [downloadingAllPdfs, setDownloadingAllPdfs] = useState(false);
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

                    <h2 className="text-3xl font-bold text-foreground tracking-tight mb-2">Review & Export</h2>
                    <p className="text-muted-foreground text-sm max-w-md font-medium">
                        Final review of your proposal. Verify data accuracy and export professional documents.
                    </p>
                </div>

                {mirrorMode && (
                    <Card className="bg-card/40 border border-border/60 overflow-hidden mb-10">
                        <CardHeader className="border-b border-border/60">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                        Mirror Mode Flight Checklist
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
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
                                    excelPreview && excelSourceData ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">1) Ingest</div>
                                    <div className="mt-2 text-sm font-semibold text-foreground">Excel Imported</div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        {excelPreview?.fileName ? excelPreview.fileName : "Upload estimator Excel"}
                                    </div>
                                </div>
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    allScreensValid && !hasOptionPlaceholder ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">2) Populate</div>
                                    <div className="mt-2 text-sm font-semibold text-foreground">Screens Valid</div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        {hasOptionPlaceholder ? "OPTION row detected" : `${screenCount} screens`}
                                    </div>
                                </div>
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    internalAudit ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">3) Audit</div>
                                    <div className="mt-2 text-sm font-semibold text-foreground">Math Ready</div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        {internalAudit?.totals?.finalClientTotal ? formatCurrency(Number(internalAudit.totals.finalClientTotal)) : "Compute internal audit"}
                                    </div>
                                </div>
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    isMirrorReadyToExport ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">4) Export</div>
                                    <div className="mt-2 text-sm font-semibold text-foreground">Verified</div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        {reconciliation?.isMatch ? "Totals match Excel" : "Run verification"}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    reconciliation?.isMatch ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Layer 1</div>
                                    <div className="mt-2 text-sm font-semibold text-foreground">Excel ↔ Audit</div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        {reconciliation?.isMatch ? "Match" : "Not verified"}
                                    </div>
                                </div>
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    pdfUrl && internalAudit ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Layer 2</div>
                                    <div className="mt-2 text-sm font-semibold text-foreground">PDF ↔ Internal Audit</div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        {pdfUrl && internalAudit ? "Ready" : "Generate PDF + Audit"}
                                    </div>
                                </div>
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    effectiveVerification?.roundingCompliance?.isCompliant ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Layer 3</div>
                                    <div className="mt-2 text-sm font-semibold text-foreground">Rounding</div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                        {effectiveVerification?.roundingCompliance?.isCompliant ? "Compliant" : "Not checked"}
                                    </div>
                                </div>
                                <div className={cn(
                                    "rounded-xl border px-4 py-3",
                                    (playbackItems?.length ?? 0) > 0 ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card/30"
                                )}>
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Layer 4</div>
                                    <div className="mt-2 text-sm font-semibold text-foreground">Line‑By‑Line Scan</div>
                                    <div className="mt-1 text-[11px] text-muted-foreground">
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
                                                    ? "border-border bg-card/40 text-muted-foreground cursor-not-allowed"
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
                        <Card className="bg-card/50 border-border overflow-hidden relative">
                            {/* 55° Slash Decorative Pattern */}
                            <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none overflow-hidden">
                                <div className="absolute top-0 right-0 w-full h-full transform rotate-[55deg] translate-x-8 -translate-y-8 bg-gradient-to-b from-brand-blue to-transparent" />
                            </div>

                            <CardHeader className="pb-4">
                                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Project Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground mb-1 truncate">{proposalName}</h3>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground font-bold uppercase tracking-widest">
                                            {screenCount} Screens
                                        </Badge>
                                        <Badge className="bg-brand-blue/10 text-brand-blue border-none text-[10px] font-bold uppercase tracking-widest">
                                            {formatCurrency(totalValue)}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-border/50">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground font-medium">Calculation Mode</span>
                                        <span className="text-foreground font-bold">{mirrorMode ? "Mirror Mode" : "Strategic AI"}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground font-medium">Data Integrity</span>
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

                        <div className="p-4 rounded-xl bg-card/30 border border-border flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Last Vault Sync</span>
                                <span className="text-xs text-muted-foreground font-medium">{lastSaved ? new Date(lastSaved as any).toLocaleString() : "Pending sync..."}</span>
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
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Export capabilities are currently locked. The "Trust but Verify" mandate requires manual confirmation of all AI-generated fields before client release.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pl-8">
                                        {unverifiedAiFields.slice(0, 4).map(field => (
                                            <div key={field} className="flex items-center gap-2 p-2 rounded-lg bg-muted border border-border text-[10px] text-foreground font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                                                {field.split('.').pop()?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                            </div>
                                        ))}
                                        {unverifiedAiFields.length > 4 && (
                                            <div className="flex items-center justify-center p-2 rounded-lg bg-card/50 border border-border/50 text-[10px] text-muted-foreground font-bold">
                                                +{unverifiedAiFields.length - 4} MORE
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* PDF sections are controlled by the Document Mode (Budget/Proposal/LOI) in the toolbar */}
                        <Card className="bg-card/40 border border-border/60 overflow-hidden mb-6">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground text-center">
                                    PDF sections are controlled by the <span className="text-foreground font-semibold">Document Mode</span> switcher in the toolbar above.
                                    <br />
                                    <span className="text-[10px]">Budget = estimate only • Proposal = formal quote • LOI = contract with signatures</span>
                                </p>
                            </CardContent>
                        </Card>

                        {/* AI-Generated SOW Toggle - Optional On-Demand Feature */}
                        <Card className="bg-card/40 border border-border/60 overflow-hidden mb-6">
                            <CardHeader className="border-b border-border/60 pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-brand-blue" />
                                        AI-Generated SOW
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <Label htmlFor="showExhibitA" className="text-sm font-semibold text-foreground mb-1">
                                            Include AI-Generated Statement of Work
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Auto-generate Design Services and Construction Logistics sections based on RFP risks
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            id="showExhibitA"
                                            checked={watch("details.showExhibitA") || false}
                                            onCheckedChange={(checked) => setValue("details.showExhibitA", checked)}
                                            className="data-[state=checked]:bg-brand-blue"
                                        />
                                    </div>
                                </div>
                                {watch("details.showExhibitA") && (
                                    <div className="mt-3 p-3 rounded-lg bg-brand-blue/5 border border-brand-blue/10">
                                        <p className="text-[10px] text-brand-blue/80">
                                            💡 AI will scan for <strong>Union</strong>, <strong>Outdoor/IP65</strong>, and <strong>Liquidated Damages</strong> keywords to generate context-aware SOW clauses
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Universal Section Toggles - Available for ALL Document Types (Hybrid Template) */}
                        <Card className="bg-card/40 border border-border/60 overflow-hidden mb-6">
                            <CardHeader className="border-b border-border/60 pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Columns className="w-4 h-4 text-brand-blue" />
                                        PDF Section Toggles
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[10px] border-brand-blue/30 text-brand-blue">
                                        Hybrid Template
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground">
                                    Control which sections appear in the PDF. Available for Budget, Proposal, and LOI.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                {/* Notes Toggle */}
                                <div className="flex items-center justify-between py-2 border-b border-border/30">
                                    <div className="flex flex-col">
                                        <Label htmlFor="showNotes" className="text-sm font-semibold text-foreground">
                                            Notes Section
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Include additional notes in the PDF
                                        </p>
                                    </div>
                                    <Switch
                                        id="showNotes"
                                        checked={watch("details.showNotes") ?? true}
                                        onCheckedChange={(checked) => setValue("details.showNotes", checked)}
                                        className="data-[state=checked]:bg-brand-blue"
                                    />
                                </div>

                                {/* Scope of Work Toggle */}
                                <div className="flex items-center justify-between py-2 border-b border-border/30">
                                    <div className="flex flex-col">
                                        <Label htmlFor="showScopeOfWork" className="text-sm font-semibold text-foreground">
                                            Scope of Work
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Include custom Scope of Work text
                                        </p>
                                    </div>
                                    <Switch
                                        id="showScopeOfWork"
                                        checked={watch("details.showScopeOfWork") || false}
                                        onCheckedChange={(checked) => setValue("details.showScopeOfWork", checked)}
                                        className="data-[state=checked]:bg-brand-blue"
                                    />
                                </div>

                                {/* Signature Block Toggle */}
                                <div className="flex items-center justify-between py-2 border-b border-border/30">
                                    <div className="flex flex-col">
                                        <Label htmlFor="showSignatureBlock" className="text-sm font-semibold text-foreground">
                                            Signature Lines
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Include signature block for both parties
                                        </p>
                                    </div>
                                    <Switch
                                        id="showSignatureBlock"
                                        checked={watch("details.showSignatureBlock") ?? true}
                                        onCheckedChange={(checked) => setValue("details.showSignatureBlock", checked)}
                                        className="data-[state=checked]:bg-brand-blue"
                                    />
                                </div>

                                {/* Payment Terms Toggle */}
                                <div className="flex items-center justify-between py-2 border-b border-border/30">
                                    <div className="flex flex-col">
                                        <Label htmlFor="showPaymentTerms" className="text-sm font-semibold text-foreground">
                                            Payment Terms
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Include payment terms section
                                        </p>
                                    </div>
                                    <Switch
                                        id="showPaymentTerms"
                                        checked={watch("details.showPaymentTerms") ?? true}
                                        onCheckedChange={(checked) => setValue("details.showPaymentTerms", checked)}
                                        className="data-[state=checked]:bg-brand-blue"
                                    />
                                </div>

                                {/* Specifications Toggle */}
                                <div className="flex items-center justify-between py-2 border-b border-border/30">
                                    <div className="flex flex-col">
                                        <Label htmlFor="showSpecifications" className="text-sm font-semibold text-foreground">
                                            Technical Specifications
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Include detailed screen specifications
                                        </p>
                                    </div>
                                    <Switch
                                        id="showSpecifications"
                                        checked={watch("details.showSpecifications") ?? true}
                                        onCheckedChange={(checked) => setValue("details.showSpecifications", checked)}
                                        className="data-[state=checked]:bg-brand-blue"
                                    />
                                </div>

                                {/* Pricing Tables Toggle */}
                                <div className="flex items-center justify-between py-2">
                                    <div className="flex flex-col">
                                        <Label htmlFor="showPricingTables" className="text-sm font-semibold text-foreground">
                                            Pricing Tables
                                        </Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Include pricing breakdown in the PDF
                                        </p>
                                    </div>
                                    <Switch
                                        id="showPricingTables"
                                        checked={watch("details.showPricingTables") ?? true}
                                        onCheckedChange={(checked) => setValue("details.showPricingTables", checked)}
                                        className="data-[state=checked]:bg-brand-blue"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Simplified Export */}
                        <Card className="bg-card/40 border border-border/60 overflow-hidden">
                            <CardHeader className="border-b border-border/60 pb-3">
                                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Download className="w-4 h-4 text-brand-blue" />
                                    Export Suite
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {(proposalPdfLoading || pdfGenerationProgress) && (
                                    <div className="px-4 py-3 border-b border-border/60 bg-muted/20">
                                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                                            <span>{pdfGenerationProgress?.label || "Generating PDF…"}</span>
                                            <span>{pdfGenerationProgress?.value ? `${pdfGenerationProgress.value}%` : ""}</span>
                                        </div>
                                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full bg-brand-blue transition-[width] duration-300"
                                                style={{ width: `${pdfGenerationProgress?.value ?? 35}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 divide-y divide-zinc-800/60">
                                    {/* Primary Bundle Option */}
                                    <div className="p-4 flex items-center justify-between hover:bg-card/40 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center border border-brand-blue/20 group-hover:scale-110 transition-transform">
                                                <Zap className="w-5 h-5 text-brand-blue" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground group-hover:text-brand-blue transition-colors">Global Export Bundle</h4>
                                                <p className="text-[11px] text-muted-foreground">Download Client PDF + Internal Audit Excel (Recommended)</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleGlobalExport}
                                            disabled={mirrorMode ? !isMirrorReadyToExport : (!allScreensValid || isGatekeeperLocked)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                                (mirrorMode ? !isMirrorReadyToExport : (!allScreensValid || isGatekeeperLocked))
                                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                                    : "bg-brand-blue text-foreground hover:bg-brand-blue/90 shadow-[0_0_20px_rgba(10,82,239,0.3)] hover:shadow-[0_0_30px_rgba(10,82,239,0.5)]"
                                            )}
                                        >
                                            {exporting ? "Generating..." : "Download Bundle"}
                                            {!exporting && <Download className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>

                                    {/* All PDF Variants */}
                                    <div className="p-4 flex items-center justify-between hover:bg-card/40 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                                <Columns className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">All PDF Variants</h4>
                                                <p className="text-[11px] text-muted-foreground">Download 9 PDFs: Budget / Proposal / LOI × Classic / Modern / Bold (current data)</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (mirrorMode ? !isMirrorReadyToExport : (!allScreensValid || isGatekeeperLocked)) return;
                                                setDownloadingAllPdfs(true);
                                                try {
                                                    await downloadAllPdfVariants();
                                                } finally {
                                                    setDownloadingAllPdfs(false);
                                                }
                                            }}
                                            disabled={mirrorMode ? !isMirrorReadyToExport : (!allScreensValid || isGatekeeperLocked)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                                                (mirrorMode ? !isMirrorReadyToExport : (!allScreensValid || isGatekeeperLocked))
                                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                                    : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_20px_rgba(5,150,105,0.25)] hover:shadow-[0_0_30px_rgba(5,150,105,0.4)]"
                                            )}
                                        >
                                            {downloadingAllPdfs ? "Generating 9…" : "Download All PDFs"}
                                            {!downloadingAllPdfs && <Download className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    {downloadingAllPdfs && pdfBatchProgress && (
                                        <div className="px-4 pb-4 -mt-2">
                                            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                                                <span>{`Generating ${pdfBatchProgress.current}/${pdfBatchProgress.total}: ${pdfBatchProgress.label}`}</span>
                                                <span>{`${Math.round((pdfBatchProgress.current / pdfBatchProgress.total) * 100)}%`}</span>
                                            </div>
                                            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-600 transition-[width] duration-300"
                                                    style={{ width: `${(pdfBatchProgress.current / pdfBatchProgress.total) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Individual Options */}
                                    <div className="grid grid-cols-2 divide-x divide-zinc-800/60">
                                        <div className="p-4 flex items-center justify-between hover:bg-card/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
                                                    <FileSpreadsheet className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-foreground">Excel Only</div>
                                                    <div className="text-[10px] text-muted-foreground">Audit Workbook</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={exportAudit}
                                                disabled={(mirrorMode && !isMirrorReadyToExport) || isGatekeeperLocked}
                                                className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="p-4 flex items-center justify-between hover:bg-card/40 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
                                                    <Eye className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-foreground">PDF Only</div>
                                                    <div className="text-[10px] text-muted-foreground">Client Proposal</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={downloadPdf}
                                                disabled={mirrorMode ? isPdfPreviewBlocked : (!allScreensValid || isGatekeeperLocked)}
                                                className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-card/40 border border-border/60 overflow-hidden">
                            <CardHeader className="border-b border-border/60 pb-3">
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-brand-blue" />
                                        Client Requests
                                    </CardTitle>
                                    <Badge className="bg-muted/50 text-foreground border border-border">
                                        {changeRequests.filter((r: any) => r.status === "OPEN").length} open
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                {changeRequestsLoading ? (
                                    <div className="text-xs text-muted-foreground">Loading…</div>
                                ) : changeRequests.length === 0 ? (
                                    <div className="text-xs text-muted-foreground">
                                        No client change requests yet. Share link clients can submit requests from the portal.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {changeRequests.slice(0, 6).map((r: any) => (
                                            <div key={r.id} className="rounded-2xl border border-border bg-card/30 p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-bold text-foreground truncate">
                                                            {r.requesterName}
                                                            {r.requesterEmail ? (
                                                                <span className="text-muted-foreground font-semibold"> • {r.requesterEmail}</span>
                                                            ) : null}
                                                        </div>
                                                        <div className="mt-1 text-[11px] text-muted-foreground">
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
                                                <div className="mt-3 text-xs text-foreground whitespace-pre-wrap">
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

                <Card className="bg-card/40 border border-border/60 overflow-hidden">
                    <CardHeader className="border-b border-border/60">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <Columns className="w-4 h-4 text-brand-blue" />
                                    Verification Studio
                                </CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
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
                                            ? "border-border bg-card/40 text-muted-foreground cursor-not-allowed"
                                            : "border-border bg-card/40 text-foreground hover:border-brand-blue/40 hover:text-foreground"
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
                                                    ? "border-border bg-card/40 text-muted-foreground cursor-not-allowed"
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
                                        <TooltipContent side="bottom" className="bg-muted border-zinc-700 text-foreground text-xs max-w-xs">
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
                                                    ? "border-border bg-card/40 text-muted-foreground cursor-not-allowed"
                                                    : isPlaying
                                                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
                                                        : "border-border bg-card/40 text-foreground hover:border-amber-500/40 hover:text-foreground"
                                            )}
                                        >
                                            {isPlaying ? <span className="inline-flex items-center gap-2"><Pause className="w-4 h-4" />Pause</span> : <span className="inline-flex items-center gap-2"><Play className="w-4 h-4" />Play Scan</span>}
                                        </button>
                                    </TooltipTrigger>
                                    {playbackItems.length === 0 && (
                                        <TooltipContent side="bottom" className="bg-muted border-zinc-700 text-foreground text-xs">
                                            Run verification first to enable scan playback
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <Tabs defaultValue="studio">
                            <TabsList className="bg-muted/40">
                                <TabsTrigger value="studio">Data Inspection</TabsTrigger>
                                <TabsTrigger value="results">Results</TabsTrigger>
                            </TabsList>

                            <TabsContent value="studio" className="mt-4">
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-border bg-card/30 overflow-hidden">
                                        <div className="shrink-0 px-4 py-3 border-b border-border/70 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Source</span>
                                                    <span className="text-xs font-semibold text-foreground">Excel Estimator</span>
                                                </div>
                                                <div className="h-4 w-px bg-muted" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Output</span>
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
                                            <ExcelGridViewer
                                                highlightedRows={highlightedRows}
                                                focusedRow={focusedRow}
                                                onFocusedRowChange={setFocusedRow}
                                                editable
                                                scanningRow={isPlaying ? (highlightedRows[0] ?? null) : null}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-border bg-card/40 px-4 py-3 text-xs text-muted-foreground">
                                        Use the live PDF preview on the right panel to compare against Excel.
                                    </div>
                                </div>

                                {playIndex >= 0 && playIndex < playbackItems.length && (
                                    <div className="mt-4 rounded-2xl border border-border bg-card/40 px-4 py-3 flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="text-xs font-bold text-foreground truncate">
                                                Scanning: {playbackItems[playIndex]?.name}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                Excel row {Number(playbackItems[playIndex]?.rowIndex || 0)} • Variance {formatCurrency(Number(playbackItems[playIndex]?.variance || 0))}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                            {playIndex + 1}/{playbackItems.length}
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="results" className="mt-4">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="lg:col-span-1 space-y-3">
                                        <div className="rounded-2xl border border-border bg-card/40 px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reconciliation</div>
                                            {reconciliation ? (
                                                <div className="mt-2 space-y-2 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">Excel Total</span>
                                                        <span className="text-foreground font-bold">{formatCurrency(reconciliation.sourceFinalTotal)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">Natalia Total</span>
                                                        <span className="text-foreground font-bold">{formatCurrency(reconciliation.calculatedFinalTotal)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">Variance</span>
                                                        <span className={cn("font-bold", reconciliation.isMatch ? "text-emerald-400" : "text-amber-300")}>
                                                            {formatCurrency(reconciliation.variance)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-muted-foreground">Match</span>
                                                        <span className={cn("font-bold", reconciliation.isMatch ? "text-emerald-400" : "text-amber-300")}>
                                                            {reconciliation.matchType}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-2 text-xs text-muted-foreground">Run verification to populate totals.</div>
                                            )}
                                        </div>

                                        <div className="rounded-2xl border border-border bg-card/40 px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exceptions</div>
                                            <div className="mt-2 text-xs text-muted-foreground font-semibold">
                                                {effectiveExceptions.length} found
                                            </div>
                                        </div>

                                        {verificationError && (
                                            <div className="rounded-2xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-xs text-red-200">
                                                {verificationError}
                                            </div>
                                        )}
                                    </div>

                                    <div className="lg:col-span-2 rounded-2xl border border-border bg-card/40 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-border/70 flex items-center justify-between">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Findings</div>
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
                                                <div className="px-4 py-6 text-sm text-muted-foreground">No per-screen data available yet.</div>
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
                                                                className="w-full text-left px-4 py-3 hover:bg-card/40 transition-colors"
                                                            >
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="min-w-0">
                                                                        <div className="text-sm font-semibold text-foreground truncate">{it.name}</div>
                                                                        <div className="text-[11px] text-muted-foreground">Excel row {row || "—"}</div>
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
                <div className="mt-auto pt-8 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">ANC Identity Protection System Active</span>
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground">
                        For branding approvals, contact <span className="text-muted-foreground underline">alison@anc.com</span>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};

export default Step4Export;
