"use client";

import { useState, useCallback, useRef } from "react";
import { useFormContext } from "react-hook-form";
import {
    Upload,
    FileText,
    Loader2,
    CheckCircle2,
    XCircle,
    ArrowRight,
    ArrowLeft,
    Monitor,
    DollarSign,
    Calendar,
    Shield,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildAutoFillValues, applyAutoFill } from "@/services/rfp/proposalAutoFill";

// ============================================================================
// TYPES
// ============================================================================

type TabId = "specs" | "pricing" | "schedule";

interface PipelineStatus {
    overview: "idle" | "running" | "done" | "failed";
    specs: "idle" | "running" | "done" | "failed";
    pricing: "idle" | "running" | "done" | "failed";
    schedule: "idle" | "running" | "done" | "failed";
}

interface ExtractedSpec {
    formId?: string;
    screenName?: string;
    location?: string;
    widthFt?: number;
    heightFt?: number;
    pitchMm?: number;
    brightness?: number;
    maxPower?: number;
    weight?: number;
    hardware?: string;
    confidence: number;
}

interface PricingSection {
    sectionNumber?: number;
    sectionName: string;
    estimatedTotal?: number;
    lineItemCount: number;
    hasTax: boolean;
    hasBond: boolean;
}

interface Alternate {
    description: string;
    type: string;
    priceDifference?: number;
}

interface SchedulePhase {
    phaseNumber?: number;
    phaseName: string;
    duration?: string;
    tasks: Array<{ name: string; duration?: string }>;
}

interface WarrantyData {
    baseYears?: number;
    extendedYears?: number;
    responseTime?: string;
    slaLevel?: string;
    sparePartsPercent?: number;
    preventativeVisitsPerYear?: number;
    annualCost?: number;
    confidence: number;
    terms: string[];
}

interface RfpIngestionProps {
    onComplete: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RfpIngestion({ onComplete }: RfpIngestionProps) {
    const { setValue } = useFormContext();

    const [activeTab, setActiveTab] = useState<TabId>("specs");
    const [pipeline, setPipeline] = useState<PipelineStatus>({
        overview: "idle", specs: "idle", pricing: "idle", schedule: "idle",
    });
    const [specData, setSpecData] = useState<{ specs: ExtractedSpec[]; method?: string } | null>(null);
    const [pricingData, setPricingData] = useState<{ sections: PricingSection[]; alternates: Alternate[]; stats?: { estimatedProjectTotal?: number } } | null>(null);
    const [scheduleData, setScheduleData] = useState<{ schedule: SchedulePhase[]; warranty: WarrantyData; method?: string } | null>(null);
    const [overviewData, setOverviewData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounter = useRef(0);

    const isProcessing = Object.values(pipeline).some(s => s === "running");
    const isDone = Object.values(pipeline).some(s => s === "done" || s === "failed") && !isProcessing;

    // ── FILE PROCESSING ──────────────────────────────────────────────────

    const processFile = useCallback(async (file: File) => {
        if (!file || file.type !== "application/pdf") return;

        setError(null);
        setSpecData(null);
        setPricingData(null);
        setScheduleData(null);
        setOverviewData(null);
        setFileName(file.name);
        setActiveTab("specs");
        setPipeline({ overview: "running", specs: "running", pricing: "running", schedule: "running" });

        const makeForm = () => {
            const fd = new FormData();
            fd.append("file", file);
            return fd;
        };

        const [ovRes, spRes, prRes, scRes] = await Promise.allSettled([
            (async () => {
                const fd = makeForm();
                fd.append("mode", "full");
                const res = await fetch("/api/rfp/process", { method: "POST", body: fd });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                setOverviewData(data);
                setPipeline(p => ({ ...p, overview: "done" }));
                return data;
            })(),
            (async () => {
                const res = await fetch("/api/rfp/extract-specs", { method: "POST", body: makeForm() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                setSpecData(data);
                setPipeline(p => ({ ...p, specs: "done" }));
                return data;
            })(),
            (async () => {
                const res = await fetch("/api/rfp/extract-pricing", { method: "POST", body: makeForm() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                setPricingData(data);
                setPipeline(p => ({ ...p, pricing: "done" }));
                return data;
            })(),
            (async () => {
                const res = await fetch("/api/rfp/extract-schedule", { method: "POST", body: makeForm() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                setScheduleData(data);
                setPipeline(p => ({ ...p, schedule: "done" }));
                return data;
            })(),
        ]);

        if (ovRes.status === "rejected") setPipeline(p => ({ ...p, overview: "failed" }));
        if (spRes.status === "rejected") setPipeline(p => ({ ...p, specs: "failed" }));
        if (prRes.status === "rejected") setPipeline(p => ({ ...p, pricing: "failed" }));
        if (scRes.status === "rejected") setPipeline(p => ({ ...p, schedule: "failed" }));

        if ([ovRes, spRes, prRes, scRes].every(r => r.status === "rejected")) {
            setError("All extractors failed. Check the PDF format and try again.");
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    // ── DRAG & DROP ──────────────────────────────────────────────────────

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    // ── AUTO-FILL ────────────────────────────────────────────────────────

    const handleApplyToProposal = useCallback(() => {
        const displays = (specData?.specs || []).map(s => ({
            name: s.screenName || s.formId || "Display",
            widthFt: s.widthFt,
            heightFt: s.heightFt,
            pitchMm: s.pitchMm,
            brightness: s.brightness,
            quantity: 1,
            environment: "Indoor" as const,
            confidence: s.confidence,
        }));

        const { values } = buildAutoFillValues({
            displays,
            specialRequirements: [],
            bondRequired: pricingData?.sections?.some(s => s.hasBond),
            extractionAccuracy: "Standard",
        });

        applyAutoFill(values, setValue);
        onComplete();
    }, [specData, pricingData, setValue, onComplete]);

    const handleReset = () => {
        setSpecData(null);
        setPricingData(null);
        setScheduleData(null);
        setOverviewData(null);
        setError(null);
        setFileName(null);
        setPipeline({ overview: "idle", specs: "idle", pricing: "idle", schedule: "idle" });
        setActiveTab("specs");
    };

    const fmt = (n: number | null | undefined) => n != null ? `$${n.toLocaleString()}` : "—";

    // ── TABS CONFIG ──────────────────────────────────────────────────────

    const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; status: keyof PipelineStatus }> = [
        { id: "specs", label: "Display Specs", icon: <Monitor className="w-3.5 h-3.5" />, status: "specs" },
        { id: "pricing", label: "Pricing", icon: <DollarSign className="w-3.5 h-3.5" />, status: "pricing" },
        { id: "schedule", label: "Schedule & Warranty", icon: <Calendar className="w-3.5 h-3.5" />, status: "schedule" },
    ];

    const pipelineSteps = [
        { label: "Structure", status: pipeline.overview },
        { label: "Specs", status: pipeline.specs },
        { label: "Pricing", status: pipeline.pricing },
        { label: "Schedule", status: pipeline.schedule },
    ];

    // ── RENDER ───────────────────────────────────────────────────────────

    return (
        <div className="h-full flex flex-col bg-background/20">
            {/* Header */}
            <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-foreground/60"></span>
                        RFP Extraction
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {fileName
                            ? `Analyzing ${fileName}`
                            : "Upload a client RFP to extract specs, pricing, and schedule"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back
                    </button>
                    {isDone && specData?.specs && specData.specs.length > 0 && (
                        <button
                            type="button"
                            onClick={handleApplyToProposal}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-foreground rounded-lg hover:bg-foreground/90 transition-colors"
                        >
                            Apply to Proposal
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Upload Zone */}
                {!isDone && !isProcessing && !error && (
                    <div
                        className="max-w-2xl mx-auto"
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <label htmlFor="rfp-ingestion-upload" className={cn(
                            "flex flex-col items-center justify-center w-full py-20 border border-dashed rounded-xl cursor-pointer transition-all",
                            isDragging
                                ? "border-foreground/40 bg-muted/30"
                                : "border-border hover:border-foreground/20 hover:bg-muted/20"
                        )}>
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                                isDragging ? "bg-muted" : "bg-muted/50"
                            )}>
                                <Upload className={cn("w-6 h-6", isDragging ? "text-foreground" : "text-muted-foreground")} />
                            </div>
                            <p className="text-sm font-medium text-foreground">
                                {isDragging ? "Drop PDF to analyze" : "Drop your RFP or bid document here"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">PDF up to 50MB — or click to browse</p>
                        </label>
                        <input ref={fileInputRef} id="rfp-ingestion-upload" type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                    </div>
                )}

                {/* Processing */}
                {isProcessing && (
                    <div className="max-w-lg mx-auto py-16 flex flex-col items-center gap-6">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Extracting from {fileName}...</p>
                        <div className="w-full space-y-2">
                            {pipelineSteps.map(step => (
                                <div key={step.label} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border">
                                    {step.status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />}
                                    {step.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-foreground shrink-0" />}
                                    {step.status === "failed" && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                                    {step.status === "idle" && <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />}
                                    <span className="text-xs font-medium text-foreground">{step.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && !isProcessing && (
                    <div className="max-w-md mx-auto py-16 flex flex-col items-center">
                        <AlertTriangle className="w-6 h-6 text-destructive mb-3" />
                        <p className="text-sm font-medium text-destructive mb-1">Extraction Failed</p>
                        <p className="text-xs text-muted-foreground text-center mb-4">{error}</p>
                        <button type="button" onClick={handleReset} className="px-4 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/30 transition-colors">
                            Try Again
                        </button>
                    </div>
                )}

                {/* Results */}
                {isDone && !error && (
                    <div className="space-y-4">
                        {/* Tab Bar */}
                        <div className="flex items-center gap-1 border-b border-border pb-px">
                            {tabs.map(t => {
                                const status = pipeline[t.status];
                                const isActive = activeTab === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setActiveTab(t.id)}
                                        disabled={status === "failed"}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all border-b-2 -mb-px",
                                            isActive ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                                            status === "failed" && "opacity-40 cursor-not-allowed"
                                        )}
                                    >
                                        {t.icon}
                                        {t.label}
                                        {status === "failed" && <XCircle className="w-3 h-3 text-destructive" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Specs Tab */}
                        {activeTab === "specs" && (
                            <div className="space-y-3">
                                {specData?.specs && specData.specs.length > 0 ? (
                                    <>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-medium text-foreground">{specData.specs.length} display{specData.specs.length !== 1 ? "s" : ""} extracted</span>
                                            {specData.method && <span className="px-1.5 py-0.5 rounded border border-border text-[10px]">{specData.method}</span>}
                                        </div>
                                        <div className="border border-border rounded-lg overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-muted/30 text-muted-foreground text-left">
                                                        <th className="px-3 py-2 font-medium">Name</th>
                                                        <th className="px-3 py-2 font-medium">Location</th>
                                                        <th className="px-3 py-2 font-medium">Dimensions</th>
                                                        <th className="px-3 py-2 font-medium">Pitch</th>
                                                        <th className="px-3 py-2 font-medium">Brightness</th>
                                                        <th className="px-3 py-2 font-medium text-right">Confidence</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {specData.specs.map((s, i) => (
                                                        <tr key={i} className="text-foreground">
                                                            <td className="px-3 py-2 font-medium">{s.screenName || s.formId || `Display ${i + 1}`}</td>
                                                            <td className="px-3 py-2 text-muted-foreground">{s.location || "—"}</td>
                                                            <td className="px-3 py-2">{s.widthFt && s.heightFt ? `${s.heightFt}' × ${s.widthFt}'` : "—"}</td>
                                                            <td className="px-3 py-2">{s.pitchMm ? `${s.pitchMm}mm` : "—"}</td>
                                                            <td className="px-3 py-2">{s.brightness ? `${s.brightness.toLocaleString()} nits` : "—"}</td>
                                                            <td className="px-3 py-2 text-right">{Math.round(s.confidence * 100)}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : pipeline.specs === "failed" ? (
                                    <EmptyState text="Spec extraction failed" />
                                ) : (
                                    <EmptyState text="No display specs found in this document" />
                                )}
                            </div>
                        )}

                        {/* Pricing Tab */}
                        {activeTab === "pricing" && (
                            <div className="space-y-4">
                                {pricingData?.sections && pricingData.sections.length > 0 ? (
                                    <>
                                        <div className="border border-border rounded-lg overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-muted/30 text-muted-foreground text-left">
                                                        <th className="px-3 py-2 font-medium">#</th>
                                                        <th className="px-3 py-2 font-medium">Section</th>
                                                        <th className="px-3 py-2 font-medium text-right">Est. Total</th>
                                                        <th className="px-3 py-2 font-medium text-center">Items</th>
                                                        <th className="px-3 py-2 font-medium text-center">Tax</th>
                                                        <th className="px-3 py-2 font-medium text-center">Bond</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {pricingData.sections.map((s, i) => (
                                                        <tr key={i} className="text-foreground">
                                                            <td className="px-3 py-2 text-muted-foreground">{s.sectionNumber || i + 1}</td>
                                                            <td className="px-3 py-2 font-medium">{s.sectionName}</td>
                                                            <td className="px-3 py-2 text-right font-mono">{fmt(s.estimatedTotal)}</td>
                                                            <td className="px-3 py-2 text-center">{s.lineItemCount}</td>
                                                            <td className="px-3 py-2 text-center">{s.hasTax ? "Yes" : "—"}</td>
                                                            <td className="px-3 py-2 text-center">{s.hasBond ? "Yes" : "—"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                {pricingData.stats?.estimatedProjectTotal && (
                                                    <tfoot>
                                                        <tr className="bg-muted/30 font-medium text-foreground">
                                                            <td className="px-3 py-2" colSpan={2}>Estimated Total</td>
                                                            <td className="px-3 py-2 text-right font-mono">{fmt(pricingData.stats.estimatedProjectTotal)}</td>
                                                            <td colSpan={3} />
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>

                                        {pricingData.alternates.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-foreground">Alternates ({pricingData.alternates.length})</p>
                                                <div className="space-y-1">
                                                    {pricingData.alternates.map((a, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs">
                                                            <span className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium uppercase">{a.type}</span>
                                                            <span className="flex-1 text-foreground">{a.description}</span>
                                                            {a.priceDifference != null && (
                                                                <span className="font-mono font-medium">{a.priceDifference >= 0 ? "+" : ""}{fmt(a.priceDifference)}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : pipeline.pricing === "failed" ? (
                                    <EmptyState text="Pricing extraction failed" />
                                ) : (
                                    <EmptyState text="No pricing sections found" />
                                )}
                            </div>
                        )}

                        {/* Schedule & Warranty Tab */}
                        {activeTab === "schedule" && (
                            <div className="space-y-6">
                                {scheduleData?.schedule && scheduleData.schedule.length > 0 ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-medium text-foreground">{scheduleData.schedule.length} phase{scheduleData.schedule.length !== 1 ? "s" : ""}</span>
                                            {scheduleData.method && <span className="px-1.5 py-0.5 rounded border border-border text-[10px]">{scheduleData.method}</span>}
                                        </div>
                                        <div className="space-y-1">
                                            {scheduleData.schedule.map((phase, idx) => (
                                                <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border text-xs">
                                                    <span className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center text-[10px] font-semibold text-foreground shrink-0">
                                                        {phase.phaseNumber || idx + 1}
                                                    </span>
                                                    <span className="flex-1 font-medium text-foreground">{phase.phaseName}</span>
                                                    {phase.duration && <span className="text-muted-foreground shrink-0">{phase.duration}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : pipeline.schedule !== "failed" ? (
                                    <EmptyState text="No schedule data found" />
                                ) : (
                                    <EmptyState text="Schedule extraction failed" />
                                )}

                                {scheduleData?.warranty && scheduleData.warranty.terms.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-xs font-medium text-foreground">Warranty & Service</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <InfoCard label="Base Warranty" value={scheduleData.warranty.baseYears ? `${scheduleData.warranty.baseYears} yr` : null} />
                                            <InfoCard label="Extended" value={scheduleData.warranty.extendedYears ? `${scheduleData.warranty.extendedYears} yr` : null} />
                                            <InfoCard label="Response Time" value={scheduleData.warranty.responseTime} />
                                            <InfoCard label="SLA" value={scheduleData.warranty.slaLevel} />
                                        </div>
                                        <div className="border border-border rounded-lg p-3 space-y-1 max-h-[160px] overflow-y-auto">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Terms</p>
                                            {scheduleData.warranty.terms.map((t, i) => (
                                                <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">• {t}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Apply Button (bottom) */}
                        {specData?.specs && specData.specs.length > 0 && (
                            <div className="pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={handleApplyToProposal}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-foreground rounded-lg hover:bg-foreground/90 transition-colors"
                                >
                                    Apply {specData.specs.length} Display{specData.specs.length !== 1 ? "s" : ""} to Proposal
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <p className="text-[10px] text-muted-foreground text-center mt-2">
                                    Extracted specs will be added as line items. You can edit them in the next step.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function EmptyState({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-xs text-muted-foreground">{text}</p>
        </div>
    );
}

function InfoCard({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div className="px-3 py-2 rounded-lg border border-border">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className={cn("text-xs font-medium mt-0.5", value ? "text-foreground" : "text-muted-foreground/40")}>{value || "—"}</div>
        </div>
    );
}
