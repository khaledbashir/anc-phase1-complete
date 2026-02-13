"use client";

import { useState, useCallback, useRef, useMemo } from "react";
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
    Plus,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildAutoFillValues } from "@/services/rfp/proposalAutoFill";
import { calculateExhibitG, calculateHardwareCost, estimatePricing, getAllProducts, getProduct } from "@/services/rfp/productCatalog";
import CompetitorRadarCard from "@/app/components/intelligence/CompetitorRadarCard";

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function CompetitorRadarWrapper({ rfpText }: { rfpText: string }) {
    const [analysis, setAnalysis] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAnalyze = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/intelligence/competitor-radar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rfpText }),
            });
            const data = await res.json();
            setAnalysis(data);
        } catch (error) {
            console.error("Competitor Radar failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return <CompetitorRadarCard analysis={analysis} isLoading={isLoading} onAnalyze={handleAnalyze} />;
}

// ============================================================================
// TYPES
// ============================================================================

type TabId = "specs" | "pricing" | "schedule" | "exhibitg";

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
    processing?: string;
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

/** Per-file upload state */
interface FileUploadState {
    file: File;
    key: string;
    status: "queued" | "processing" | "done" | "error";
    pipeline: PipelineStatus;
    results: {
        specData: { specs: ExtractedSpec[]; method?: string } | null;
        pricingData: { sections: PricingSection[]; alternates: Alternate[]; stats?: { estimatedProjectTotal?: number } } | null;
        scheduleData: { schedule: SchedulePhase[]; warranty: WarrantyData; method?: string } | null;
        overviewData: any;
    };
    error?: string;
}

/** Source-tagged wrapper for merged results */
interface SourceTagged<T> {
    data: T;
    sourceFile: string;
    sourceKey: string;
}

interface RfpIngestionProps {
    onComplete: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RfpIngestion({ onComplete }: RfpIngestionProps) {
    const { getValues, reset } = useFormContext();

    const [activeTab, setActiveTab] = useState<TabId>("specs");
    const [uploads, setUploads] = useState<Map<string, FileUploadState>>(new Map());
    const [isDragging, setIsDragging] = useState(false);
    const [applied, setApplied] = useState<{ screensCount: number; fields: string[]; warnings: string[] } | null>(null);
    const [exhibitOverrides, setExhibitOverrides] = useState<Record<number, {
        maxPowerW?: number;
        avgPowerW?: number;
        totalWeightLbs?: number;
        installCost?: number;
        pmCost?: number;
        engCost?: number;
    }>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addMoreInputRef = useRef<HTMLInputElement>(null);
    const dragCounter = useRef(0);
    const processingRef = useRef(false);

    // ── COMPUTED STATE ────────────────────────────────────────────────────

    const allUploads = useMemo(() => Array.from(uploads.values()), [uploads]);
    const hasFiles = allUploads.length > 0;
    const isProcessing = allUploads.some(u => u.status === "processing" || u.status === "queued");
    const completedCount = allUploads.filter(u => u.status === "done").length;
    const isDone = hasFiles && allUploads.every(u => u.status === "done" || u.status === "error") && !isProcessing;
    const allFailed = hasFiles && allUploads.every(u => u.status === "error");
    const globalError = allFailed ? "All files failed extraction. Check the PDF formats and try again." : null;

    // Merged results across all completed files with source tracking
    const mergedSpecs: SourceTagged<ExtractedSpec>[] = useMemo(() =>
        allUploads
            .filter(u => u.status === "done" && u.results.specData?.specs)
            .flatMap(u => u.results.specData!.specs.map(spec => ({
                data: spec,
                sourceFile: u.file.name,
                sourceKey: u.key,
            }))),
        [allUploads]
    );

    const mergedPricingSections: SourceTagged<PricingSection>[] = useMemo(() =>
        allUploads
            .filter(u => u.status === "done" && u.results.pricingData?.sections)
            .flatMap(u => u.results.pricingData!.sections.map(s => ({
                data: s,
                sourceFile: u.file.name,
                sourceKey: u.key,
            }))),
        [allUploads]
    );

    const mergedAlternates: SourceTagged<Alternate>[] = useMemo(() =>
        allUploads
            .filter(u => u.status === "done" && u.results.pricingData?.alternates)
            .flatMap(u => u.results.pricingData!.alternates.map(a => ({
                data: a,
                sourceFile: u.file.name,
                sourceKey: u.key,
            }))),
        [allUploads]
    );

    const mergedSchedulePhases: SourceTagged<SchedulePhase>[] = useMemo(() =>
        allUploads
            .filter(u => u.status === "done" && u.results.scheduleData?.schedule)
            .flatMap(u => u.results.scheduleData!.schedule.map(p => ({
                data: p,
                sourceFile: u.file.name,
                sourceKey: u.key,
            }))),
        [allUploads]
    );

    // First warranty found (take the most complete one)
    const mergedWarranty: (WarrantyData & { sourceFile: string }) | null = useMemo(() => {
        for (const u of allUploads) {
            if (u.status === "done" && u.results.scheduleData?.warranty && u.results.scheduleData.warranty.terms.length > 0) {
                return { ...u.results.scheduleData.warranty, sourceFile: u.file.name };
            }
        }
        return null;
    }, [allUploads]);

    const estimatedProjectTotal = useMemo(() =>
        allUploads.reduce((sum, u) => sum + (u.results.pricingData?.stats?.estimatedProjectTotal || 0), 0) || null,
        [allUploads]
    );

    // Display name for header
    const fileLabel = allUploads.length === 0
        ? null
        : allUploads.length === 1
            ? allUploads[0].file.name
            : `${allUploads.length} files`;

    // ── FILE PROCESSING ──────────────────────────────────────────────────

    const generateFileKey = (file: File): string =>
        `${file.name}__${file.size}__${Date.now()}__${Math.random().toString(36).slice(2, 6)}`;

    const processSingleFile = useCallback(async (fileState: FileUploadState): Promise<FileUploadState> => {
        const { file } = fileState;

        const makeForm = () => {
            const fd = new FormData();
            fd.append("file", file);
            return fd;
        };

        const results = {
            specData: null as FileUploadState["results"]["specData"],
            pricingData: null as FileUploadState["results"]["pricingData"],
            scheduleData: null as FileUploadState["results"]["scheduleData"],
            overviewData: null as any,
        };
        const pipeline: PipelineStatus = { overview: "running", specs: "running", pricing: "running", schedule: "running" };

        const [ovRes, spRes, prRes, scRes] = await Promise.allSettled([
            (async () => {
                const fd = makeForm();
                fd.append("mode", "full");
                const res = await fetch("/api/rfp/process", { method: "POST", body: fd });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                results.overviewData = data;
                pipeline.overview = "done";
                return data;
            })(),
            (async () => {
                const res = await fetch("/api/rfp/extract-specs", { method: "POST", body: makeForm() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                results.specData = data;
                pipeline.specs = "done";
                return data;
            })(),
            (async () => {
                const res = await fetch("/api/rfp/extract-pricing", { method: "POST", body: makeForm() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                results.pricingData = data;
                pipeline.pricing = "done";
                return data;
            })(),
            (async () => {
                const res = await fetch("/api/rfp/extract-schedule", { method: "POST", body: makeForm() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                results.scheduleData = data;
                pipeline.schedule = "done";
                return data;
            })(),
        ]);

        if (ovRes.status === "rejected") pipeline.overview = "failed";
        if (spRes.status === "rejected") pipeline.specs = "failed";
        if (prRes.status === "rejected") pipeline.pricing = "failed";
        if (scRes.status === "rejected") pipeline.schedule = "failed";

        const allRejected = [ovRes, spRes, prRes, scRes].every(r => r.status === "rejected");

        return {
            ...fileState,
            status: allRejected ? "error" : "done",
            pipeline,
            results,
            error: allRejected ? "All extractors failed" : undefined,
        };
    }, []);

    const processFiles = useCallback(async (files: File[]) => {
        if (processingRef.current) return;
        processingRef.current = true;

        const pdfFiles = files.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
        if (pdfFiles.length === 0) {
            processingRef.current = false;
            return;
        }

        // Initialize all files as queued
        const fileStates: FileUploadState[] = pdfFiles.map(file => ({
            file,
            key: generateFileKey(file),
            status: "queued" as const,
            pipeline: { overview: "idle", specs: "idle", pricing: "idle", schedule: "idle" },
            results: { specData: null, pricingData: null, scheduleData: null, overviewData: null },
        }));

        setUploads(prev => {
            const next = new Map(prev);
            for (const fs of fileStates) next.set(fs.key, fs);
            return next;
        });
        setExhibitOverrides({});

        // Process sequentially — one file at a time, 4 parallel requests each
        for (const fileState of fileStates) {
            // Mark as processing
            setUploads(prev => {
                const next = new Map(prev);
                const current = next.get(fileState.key);
                if (current) {
                    next.set(fileState.key, {
                        ...current,
                        status: "processing",
                        pipeline: { overview: "running", specs: "running", pricing: "running", schedule: "running" },
                    });
                }
                return next;
            });

            const result = await processSingleFile(fileState);

            setUploads(prev => {
                const next = new Map(prev);
                next.set(fileState.key, result);
                return next;
            });
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
        if (addMoreInputRef.current) addMoreInputRef.current.value = "";
        processingRef.current = false;
    }, [processSingleFile]);

    // ── DRAG & DROP ──────────────────────────────────────────────────────

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) processFiles(files);
    }, [processFiles]);

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
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) processFiles(files);
    }, [processFiles]);

    // ── FILE MANAGEMENT ──────────────────────────────────────────────────

    const removeFile = useCallback((key: string) => {
        setUploads(prev => {
            const next = new Map(prev);
            next.delete(key);
            return next;
        });
        setExhibitOverrides({});
    }, []);

    const removeAllFiles = useCallback(() => {
        setUploads(new Map());
        setExhibitOverrides({});
        setApplied(null);
    }, []);

    // ── AUTO-FILL ────────────────────────────────────────────────────────

    const handleApplyToProposal = useCallback(() => {
        const displays = mergedSpecs.map(tagged => ({
            name: tagged.data.screenName || tagged.data.formId || "Display",
            widthFt: tagged.data.widthFt,
            heightFt: tagged.data.heightFt,
            pitchMm: tagged.data.pitchMm,
            brightness: tagged.data.brightness,
            maxPower: tagged.data.maxPower,
            weight: tagged.data.weight,
            hardware: tagged.data.hardware,
            processing: tagged.data.processing,
            quantity: 1,
            environment: "Indoor" as const,
            confidence: tagged.data.confidence,
        }));

        const { values, result } = buildAutoFillValues({
            displays,
            specialRequirements: [],
            bondRequired: mergedPricingSections.some(s => s.data.hasBond),
            extractionAccuracy: "Standard",
            extractedSchedulePhases: mergedSchedulePhases.map(tagged => ({
                phaseName: tagged.data.phaseName,
                phaseNumber: tagged.data.phaseNumber != null ? String(tagged.data.phaseNumber) : null,
                duration: tagged.data.duration || null,
                startDate: null,
                endDate: null,
                tasks: (tagged.data.tasks || []).map(task => ({
                    name: task.name,
                    duration: task.duration || null,
                })),
            })),
        }, exhibitOverrides);

        const current = getValues();
        const merged = { ...current };

        for (const [key, val] of Object.entries(values)) {
            const parts = key.split(".");
            let target: any = merged;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!target[parts[i]]) target[parts[i]] = {};
                target = target[parts[i]];
            }
            target[parts[parts.length - 1]] = val;
        }

        reset(merged, { keepDirty: true });

        setApplied({
            screensCount: result.screensCreated,
            fields: result.fieldsPopulated,
            warnings: result.warnings,
        });
    }, [mergedSpecs, mergedPricingSections, mergedSchedulePhases, exhibitOverrides, getValues, reset]);

    const handleReset = useCallback(() => {
        setUploads(new Map());
        setApplied(null);
        setActiveTab("specs");
        setExhibitOverrides({});
        processingRef.current = false;
    }, []);

    // ── HELPERS ───────────────────────────────────────────────────────────

    const fmt = (n: number | null | undefined) => n != null ? `$${n.toLocaleString()}` : "—";
    const allProducts = getAllProducts();
    const toNum = (v: any): number | null => {
        if (v == null || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };
    const matchProductIdFromPitch = (pitchMmRaw: number | null): string | null => {
        if (!pitchMmRaw || !Number.isFinite(pitchMmRaw) || pitchMmRaw <= 0) return null;
        const pitchMm = Number(pitchMmRaw);
        if (Math.abs(pitchMm - 4) <= 0.15) return "4mm-nitxeon";
        if (Math.abs(pitchMm - 10) <= 0.25) return "10mm-mesh";
        if (Math.abs(pitchMm - 2.5) <= 0.15) return "2.5mm-mip";
        const nearest = allProducts
            .map((p) => ({ id: p.id, diff: Math.abs(p.pitchMm - pitchMm) }))
            .sort((a, b) => a.diff - b.diff)[0];
        return nearest && nearest.diff <= 1.5 ? nearest.id : null;
    };
    const deriveZoneSizeFromArea = (areaM2: number): "small" | "medium" | "large" => {
        if (!Number.isFinite(areaM2) || areaM2 <= 0) return "small";
        if (areaM2 < 10) return "small";
        if (areaM2 <= 50) return "medium";
        return "large";
    };
    const toZoneClass = (zoneSize: "small" | "medium" | "large"): "standard" | "medium" | "large" => {
        if (zoneSize === "large") return "large";
        if (zoneSize === "medium") return "medium";
        return "standard";
    };

    const exhibitRows = mergedSpecs.map((tagged, idx) => {
        const s = tagged.data;
        const pitch = toNum(s.pitchMm);
        const widthFt = toNum(s.widthFt) ?? 0;
        const heightFt = toNum(s.heightFt) ?? 0;
        const productId = matchProductIdFromPitch(pitch);
        const product = productId ? getProduct(productId) : undefined;
        if (!product || !pitch || widthFt <= 0 || heightFt <= 0) {
            return {
                idx,
                screenName: s.screenName || s.formId || `Display ${idx + 1}`,
                sourceFile: tagged.sourceFile,
                extracted: s,
                calculated: null as any,
                productLabel: product?.name || "No match",
                zoneSize: "small" as const,
            };
        }
        const resolutionW = Math.round((widthFt * 304.8) / pitch);
        const resolutionH = Math.round((heightFt * 304.8) / pitch);
        const exhibit = resolutionW > 0 && resolutionH > 0 ? calculateExhibitG(product, resolutionW, resolutionH) : null;
        if (!exhibit) {
            return {
                idx,
                screenName: s.screenName || s.formId || `Display ${idx + 1}`,
                sourceFile: tagged.sourceFile,
                extracted: s,
                calculated: null as any,
                productLabel: product.name,
                zoneSize: "small" as const,
            };
        }
        const zoneSize = deriveZoneSizeFromArea(exhibit.activeAreaM2);
        const hwCost = calculateHardwareCost(exhibit.activeAreaM2, product.id);
        const pricing = estimatePricing(exhibit, toZoneClass(zoneSize), hwCost);
        const ovr = exhibitOverrides[idx] || {};
        return {
            idx,
            screenName: s.screenName || s.formId || `Display ${idx + 1}`,
            sourceFile: tagged.sourceFile,
            extracted: s,
            calculated: {
                maxPowerW: ovr.maxPowerW ?? exhibit.maxPowerW,
                avgPowerW: ovr.avgPowerW ?? exhibit.avgPowerW,
                totalWeightLbs: ovr.totalWeightLbs ?? exhibit.totalWeightLbs,
                installCost: ovr.installCost ?? pricing.installCost,
                pmCost: ovr.pmCost ?? pricing.pmCost,
                engCost: ovr.engCost ?? pricing.engCost,
            },
            productLabel: product.name,
            zoneSize,
        };
    });

    const hasDiff = (a: number | null | undefined, b: number | null | undefined, tolerance = 1) => {
        if (a == null || b == null) return false;
        return Math.abs(Number(a) - Number(b)) > tolerance;
    };

    // Check if ANY pipeline in ANY upload has a specific status
    const anyPipelineStatus = (key: keyof PipelineStatus): "idle" | "running" | "done" | "failed" => {
        if (allUploads.some(u => u.pipeline[key] === "done")) return "done";
        if (allUploads.some(u => u.pipeline[key] === "running")) return "running";
        if (allUploads.some(u => u.pipeline[key] === "failed")) return "failed";
        return "idle";
    };

    const showMultiFileSource = allUploads.length > 1;

    // ── TABS CONFIG ──────────────────────────────────────────────────────

    const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; status: keyof PipelineStatus }> = [
        { id: "specs", label: "Display Specs", icon: <Monitor className="w-3.5 h-3.5" />, status: "specs" },
        { id: "pricing", label: "Pricing", icon: <DollarSign className="w-3.5 h-3.5" />, status: "pricing" },
        { id: "schedule", label: "Schedule & Warranty", icon: <Calendar className="w-3.5 h-3.5" />, status: "schedule" },
        { id: "exhibitg", label: "Exhibit G Preview", icon: <Shield className="w-3.5 h-3.5" />, status: "specs" },
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
                        {isProcessing
                            ? `Processing ${completedCount} of ${allUploads.length} file${allUploads.length !== 1 ? "s" : ""}...`
                            : fileLabel
                                ? `Analyzed ${fileLabel}`
                                : "Upload your RFP package to extract specs, pricing, and schedule"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!applied && (
                        <button
                            type="button"
                            onClick={() => { handleReset(); onComplete(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back
                        </button>
                    )}
                    {isDone && !applied && mergedSpecs.length > 0 && (
                        <button
                            type="button"
                            onClick={handleApplyToProposal}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-foreground rounded-lg hover:bg-foreground/90 transition-colors"
                        >
                            Apply to Proposal
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {applied && (
                        <button
                            type="button"
                            onClick={onComplete}
                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-foreground rounded-lg hover:bg-foreground/90 transition-colors"
                        >
                            Continue to Proposal
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Applied Confirmation */}
                {applied && (
                    <div className="max-w-lg mx-auto py-12 space-y-6">
                        <div className="flex flex-col items-center text-center">
                            <CheckCircle2 className="w-8 h-8 text-foreground mb-3" />
                            <h2 className="text-lg font-semibold text-foreground">Data Applied to Proposal</h2>
                            <p className="text-xs text-muted-foreground mt-1">
                                {applied.screensCount} display{applied.screensCount !== 1 ? "s" : ""} and {applied.fields.length} field{applied.fields.length !== 1 ? "s" : ""} populated
                                {showMultiFileSource ? ` from ${completedCount} file${completedCount !== 1 ? "s" : ""}` : fileLabel ? ` from ${fileLabel}` : ""}
                            </p>
                        </div>

                        <div className="space-y-2">
                            {applied.fields.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-foreground shrink-0" />
                                    <span className="text-foreground">{f}</span>
                                </div>
                            ))}
                        </div>

                        {applied.warnings.length > 0 && (
                            <div className="space-y-1">
                                {applied.warnings.map((w, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{w}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onComplete}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-foreground rounded-lg hover:bg-foreground/90 transition-colors"
                        >
                            Continue to Proposal
                            <ArrowRight className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] text-muted-foreground text-center">
                            You can review and edit all extracted data in the proposal form.
                        </p>
                    </div>
                )}

                {/* Upload Zone — Show when no files yet, or show compact "add more" when files exist */}
                {!applied && !isProcessing && (
                    <>
                        {/* Full upload zone when no files */}
                        {!hasFiles && (
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
                                        {isDragging ? "Drop PDFs to analyze" : "Drop your RFP package here"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        One PDF or multiple — select the whole package
                                    </p>
                                </label>
                                <input ref={fileInputRef} id="rfp-ingestion-upload" type="file" accept=".pdf" multiple onChange={handleFileSelect} className="hidden" />
                            </div>
                        )}
                    </>
                )}

                {/* Processing: File list with per-file progress */}
                {isProcessing && !applied && (
                    <div className="max-w-lg mx-auto py-8 space-y-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            <p className="text-sm font-medium text-foreground">
                                Processing {completedCount} of {allUploads.length} file{allUploads.length !== 1 ? "s" : ""}...
                            </p>
                        </div>
                        {allUploads.map(upload => (
                            <div key={upload.key} className="border border-border rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-2 text-xs">
                                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="font-medium text-foreground flex-1 truncate">{upload.file.name}</span>
                                    <span className="text-muted-foreground shrink-0">{(upload.file.size / 1024 / 1024).toFixed(1)} MB</span>
                                    {upload.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-foreground shrink-0" />}
                                    {upload.status === "error" && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                                    {upload.status === "queued" && <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />}
                                </div>
                                {upload.status === "processing" && (
                                    <div className="space-y-1 pl-5">
                                        {([
                                            { label: "Looking for Division 11...", status: upload.pipeline.overview },
                                            { label: "Pulling display specs...", status: upload.pipeline.specs },
                                            { label: "Extracting pricing sections...", status: upload.pipeline.pricing },
                                            { label: "Extracting schedule & warranty...", status: upload.pipeline.schedule },
                                        ]).map(step => (
                                            <div key={step.label} className="flex items-center gap-2 text-xs">
                                                {step.status === "running" && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                                                {step.status === "done" && <CheckCircle2 className="w-3 h-3 text-foreground" />}
                                                {step.status === "failed" && <XCircle className="w-3 h-3 text-destructive" />}
                                                {step.status === "idle" && <div className="w-3 h-3 rounded-full border border-border" />}
                                                <span className="text-muted-foreground">{step.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Global Error */}
                {globalError && !isProcessing && !applied && (
                    <div className="max-w-md mx-auto py-16 flex flex-col items-center">
                        <AlertTriangle className="w-6 h-6 text-destructive mb-3" />
                        <p className="text-sm font-medium text-destructive mb-1">Extraction Failed</p>
                        <p className="text-xs text-muted-foreground text-center mb-4">{globalError}</p>
                        <button type="button" onClick={handleReset} className="px-4 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/30 transition-colors">
                            Try Again
                        </button>
                    </div>
                )}

                {/* Results */}
                {isDone && !globalError && !applied && (
                    <div className="space-y-4"
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        {/* Intelligence Modules */}
                        {mergedSpecs.length > 0 && (
                            <div className="mb-6">
                                <CompetitorRadarWrapper
                                    rfpText={allUploads.map(u => u.results.overviewData?.content || "").join("\n\n")}
                                />
                            </div>
                        )}

                        {/* File summary + add more */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="font-medium text-foreground">
                                    {mergedSpecs.length} display{mergedSpecs.length !== 1 ? "s" : ""}, {mergedPricingSections.length} pricing section{mergedPricingSections.length !== 1 ? "s" : ""}, {mergedSchedulePhases.length} phase{mergedSchedulePhases.length !== 1 ? "s" : ""}
                                </span>
                                {showMultiFileSource && (
                                    <span className="text-muted-foreground">from {completedCount} file{completedCount !== 1 ? "s" : ""}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors">
                                    <Plus className="w-3 h-3" />
                                    Add Files
                                    <input ref={addMoreInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleFileSelect} />
                                </label>
                                <button
                                    type="button"
                                    onClick={removeAllFiles}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive border border-border rounded-lg hover:bg-muted/30 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* File chips */}
                        {showMultiFileSource && (
                            <div className="flex flex-wrap gap-1.5">
                                {allUploads.map(u => (
                                    <div key={u.key} className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-[10px]">
                                        {u.status === "done" ? (
                                            <CheckCircle2 className="w-3 h-3 text-foreground shrink-0" />
                                        ) : (
                                            <XCircle className="w-3 h-3 text-destructive shrink-0" />
                                        )}
                                        <span className="text-foreground truncate max-w-[180px]">{u.file.name}</span>
                                        <button type="button" onClick={() => removeFile(u.key)} className="text-muted-foreground hover:text-destructive transition-colors ml-0.5">
                                            <XCircle className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pricing summary */}
                        {mergedPricingSections.length > 0 && (
                            <div className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                                <p className="font-medium text-foreground">
                                    {mergedPricingSections.length} section{mergedPricingSections.length !== 1 ? "s" : ""}, {mergedPricingSections.reduce((sum, s) => sum + (s.data.lineItemCount || 0), 0)} line items.
                                </p>
                                {estimatedProjectTotal ? (
                                    <p className="mt-1">
                                        Grand total: {fmt(estimatedProjectTotal)}.{" "}
                                        {estimatedProjectTotal >= 5_000_000
                                            ? "That's a major deployment. Let's get it right."
                                            : "Solid build."}
                                    </p>
                                ) : null}
                            </div>
                        )}

                        {/* Tab Bar */}
                        <div className="flex items-center gap-1 border-b border-border pb-px">
                            {tabs.map(t => {
                                const status = anyPipelineStatus(t.status);
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
                                {mergedSpecs.length > 0 ? (
                                    <>
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
                                                        {showMultiFileSource && <th className="px-3 py-2 font-medium">Source</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {mergedSpecs.map((tagged, i) => {
                                                        const s = tagged.data;
                                                        return (
                                                            <tr key={i} className="text-foreground">
                                                                <td className="px-3 py-2 font-medium">{s.screenName || s.formId || `Display ${i + 1}`}</td>
                                                                <td className="px-3 py-2 text-muted-foreground">{s.location || "—"}</td>
                                                                <td className="px-3 py-2">{s.widthFt && s.heightFt ? `${s.heightFt}' x ${s.widthFt}'` : "—"}</td>
                                                                <td className="px-3 py-2">{s.pitchMm ? `${s.pitchMm}mm` : "—"}</td>
                                                                <td className="px-3 py-2">{s.brightness ? `${s.brightness.toLocaleString()} nits` : "—"}</td>
                                                                <td className="px-3 py-2 text-right">{Math.round(s.confidence * 100)}%</td>
                                                                {showMultiFileSource && (
                                                                    <td className="px-3 py-2 text-muted-foreground text-[10px] truncate max-w-[140px]" title={tagged.sourceFile}>
                                                                        {tagged.sourceFile}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : anyPipelineStatus("specs") === "failed" ? (
                                    <EmptyState text="Spec extraction failed" />
                                ) : (
                                    <EmptyState text="No display specs found in uploaded documents" />
                                )}
                            </div>
                        )}

                        {/* Pricing Tab */}
                        {activeTab === "pricing" && (
                            <div className="space-y-4">
                                {mergedPricingSections.length > 0 ? (
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
                                                        {showMultiFileSource && <th className="px-3 py-2 font-medium">Source</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {mergedPricingSections.map((tagged, i) => {
                                                        const s = tagged.data;
                                                        return (
                                                            <tr key={i} className="text-foreground">
                                                                <td className="px-3 py-2 text-muted-foreground">{s.sectionNumber || i + 1}</td>
                                                                <td className="px-3 py-2 font-medium">{s.sectionName}</td>
                                                                <td className="px-3 py-2 text-right font-mono">{fmt(s.estimatedTotal)}</td>
                                                                <td className="px-3 py-2 text-center">{s.lineItemCount}</td>
                                                                <td className="px-3 py-2 text-center">{s.hasTax ? "Yes" : "—"}</td>
                                                                <td className="px-3 py-2 text-center">{s.hasBond ? "Yes" : "—"}</td>
                                                                {showMultiFileSource && (
                                                                    <td className="px-3 py-2 text-muted-foreground text-[10px] truncate max-w-[140px]" title={tagged.sourceFile}>
                                                                        {tagged.sourceFile}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                {estimatedProjectTotal && (
                                                    <tfoot>
                                                        <tr className="bg-muted/30 font-medium text-foreground">
                                                            <td className="px-3 py-2" colSpan={2}>Estimated Total</td>
                                                            <td className="px-3 py-2 text-right font-mono">{fmt(estimatedProjectTotal)}</td>
                                                            <td colSpan={showMultiFileSource ? 4 : 3} />
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>

                                        {mergedAlternates.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-foreground">Alternates ({mergedAlternates.length})</p>
                                                <div className="space-y-1">
                                                    {mergedAlternates.map((tagged, i) => {
                                                        const a = tagged.data;
                                                        return (
                                                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs">
                                                                <span className="px-1.5 py-0.5 rounded border border-border text-[10px] font-medium uppercase">{a.type}</span>
                                                                <span className="flex-1 text-foreground">{a.description}</span>
                                                                {a.priceDifference != null && (
                                                                    <span className="font-mono font-medium">{a.priceDifference >= 0 ? "+" : ""}{fmt(a.priceDifference)}</span>
                                                                )}
                                                                {showMultiFileSource && (
                                                                    <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={tagged.sourceFile}>{tagged.sourceFile}</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : anyPipelineStatus("pricing") === "failed" ? (
                                    <EmptyState text="Pricing extraction failed" />
                                ) : (
                                    <EmptyState text="No pricing sections found" />
                                )}
                            </div>
                        )}

                        {/* Schedule & Warranty Tab */}
                        {activeTab === "schedule" && (
                            <div className="space-y-6">
                                {mergedSchedulePhases.length > 0 ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-medium text-foreground">{mergedSchedulePhases.length} phase{mergedSchedulePhases.length !== 1 ? "s" : ""}</span>
                                        </div>
                                        <div className="space-y-1">
                                            {mergedSchedulePhases.map((tagged, idx) => {
                                                const phase = tagged.data;
                                                return (
                                                    <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border text-xs">
                                                        <span className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center text-[10px] font-semibold text-foreground shrink-0">
                                                            {phase.phaseNumber || idx + 1}
                                                        </span>
                                                        <span className="flex-1 font-medium text-foreground">{phase.phaseName}</span>
                                                        {phase.duration && <span className="text-muted-foreground shrink-0">{phase.duration}</span>}
                                                        {showMultiFileSource && (
                                                            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={tagged.sourceFile}>{tagged.sourceFile}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : anyPipelineStatus("schedule") !== "failed" ? (
                                    <EmptyState text="No schedule data found" />
                                ) : (
                                    <EmptyState text="Schedule extraction failed" />
                                )}

                                {mergedWarranty && mergedWarranty.terms.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-medium text-foreground">Warranty & Service</p>
                                            {showMultiFileSource && (
                                                <span className="text-[10px] text-muted-foreground">from {mergedWarranty.sourceFile}</span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <InfoCard label="Base Warranty" value={mergedWarranty.baseYears ? `${mergedWarranty.baseYears} yr` : null} />
                                            <InfoCard label="Extended" value={mergedWarranty.extendedYears ? `${mergedWarranty.extendedYears} yr` : null} />
                                            <InfoCard label="Response Time" value={mergedWarranty.responseTime} />
                                            <InfoCard label="SLA" value={mergedWarranty.slaLevel} />
                                        </div>
                                        <div className="border border-border rounded-lg p-3 space-y-1 max-h-[160px] overflow-y-auto">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Terms</p>
                                            {mergedWarranty.terms.map((t, i) => (
                                                <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">• {t}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Exhibit G Preview Tab */}
                        {activeTab === "exhibitg" && (
                            <div className="space-y-4">
                                {exhibitRows.length > 0 ? (
                                    <>
                                        <p className="text-xs text-muted-foreground">
                                            Cross-check extracted values vs catalog-derived Exhibit G calculations. Amber rows indicate mismatch.
                                        </p>
                                        <div className="space-y-3">
                                            {exhibitRows.map((row) => {
                                                const mismatchPower = hasDiff(row.extracted.maxPower, row.calculated?.maxPowerW, 10);
                                                const mismatchWeight = hasDiff(row.extracted.weight, row.calculated?.totalWeightLbs, 10);
                                                const mismatch = mismatchPower || mismatchWeight;
                                                return (
                                                    <div
                                                        key={`exg-${row.idx}`}
                                                        className={cn(
                                                            "border rounded-lg overflow-hidden",
                                                            mismatch ? "border-amber-500/40 bg-amber-500/5" : "border-border"
                                                        )}
                                                    >
                                                        <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
                                                            <div className="text-xs font-semibold text-foreground">{row.screenName}</div>
                                                            <div className="text-[10px] text-muted-foreground">
                                                                {row.productLabel} • {row.zoneSize}
                                                                {showMultiFileSource && <span className="ml-2">{row.sourceFile}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2">
                                                            <div className="p-3 border-r border-border/60">
                                                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Extracted from RFP</div>
                                                                <div className="space-y-1 text-xs">
                                                                    <div className="flex justify-between"><span className="text-muted-foreground">Pitch</span><span>{row.extracted.pitchMm ? `${row.extracted.pitchMm}mm` : "—"}</span></div>
                                                                    <div className="flex justify-between"><span className="text-muted-foreground">Dimensions</span><span>{row.extracted.widthFt && row.extracted.heightFt ? `${row.extracted.heightFt}' x ${row.extracted.widthFt}'` : "—"}</span></div>
                                                                    <div className={cn("flex justify-between", mismatchPower && "text-amber-300")}><span className="text-muted-foreground">Max Power</span><span>{row.extracted.maxPower ? `${Math.round(row.extracted.maxPower).toLocaleString()} W` : "—"}</span></div>
                                                                    <div className={cn("flex justify-between", mismatchWeight && "text-amber-300")}><span className="text-muted-foreground">Weight</span><span>{row.extracted.weight ? `${Math.round(row.extracted.weight).toLocaleString()} lbs` : "—"}</span></div>
                                                                    <div className="flex justify-between"><span className="text-muted-foreground">Brightness</span><span>{row.extracted.brightness ? `${Math.round(row.extracted.brightness).toLocaleString()} nits` : "—"}</span></div>
                                                                    <div className="flex justify-between"><span className="text-muted-foreground">Hardware</span><span className="text-right ml-2">{row.extracted.hardware || "—"}</span></div>
                                                                </div>
                                                            </div>
                                                            <div className="p-3">
                                                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Calculated from Catalog (editable)</div>
                                                                {row.calculated ? (
                                                                    <div className="space-y-2 text-xs">
                                                                        <EditableNumber
                                                                            label="Computed Max Power"
                                                                            value={row.calculated.maxPowerW}
                                                                            unit="W"
                                                                            highlight={mismatchPower}
                                                                            onChange={(v) => setExhibitOverrides((prev) => ({ ...prev, [row.idx]: { ...(prev[row.idx] || {}), maxPowerW: v } }))}
                                                                        />
                                                                        <EditableNumber
                                                                            label="Computed Avg Power"
                                                                            value={row.calculated.avgPowerW}
                                                                            unit="W"
                                                                            onChange={(v) => setExhibitOverrides((prev) => ({ ...prev, [row.idx]: { ...(prev[row.idx] || {}), avgPowerW: v } }))}
                                                                        />
                                                                        <EditableNumber
                                                                            label="Computed Weight"
                                                                            value={row.calculated.totalWeightLbs}
                                                                            unit="lbs"
                                                                            highlight={mismatchWeight}
                                                                            onChange={(v) => setExhibitOverrides((prev) => ({ ...prev, [row.idx]: { ...(prev[row.idx] || {}), totalWeightLbs: v } }))}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-muted-foreground">Missing pitch/product match or dimensions; unable to calculate.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <EmptyState text="No Exhibit G candidates found" />
                                )}
                            </div>
                        )}

                        {/* Apply Button (bottom) */}
                        {mergedSpecs.length > 0 && (
                            <div className="pt-4 border-t border-border">
                                <button
                                    type="button"
                                    onClick={handleApplyToProposal}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-foreground rounded-lg hover:bg-foreground/90 transition-colors"
                                >
                                    Apply {mergedSpecs.length} Display{mergedSpecs.length !== 1 ? "s" : ""} to Proposal
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

function EditableNumber({
    label,
    value,
    unit,
    highlight,
    onChange,
}: {
    label: string;
    value: number;
    unit?: string;
    highlight?: boolean;
    onChange: (value: number) => void;
}) {
    return (
        <div className={cn("flex items-center justify-between gap-3", highlight && "text-amber-300")}>
            <span className="text-muted-foreground">{label}</span>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    value={Number.isFinite(value) ? value : 0}
                    onChange={(e) => onChange(Number(e.target.value || 0))}
                    className={cn(
                        "w-28 h-7 px-2 rounded border bg-background text-right text-xs",
                        highlight ? "border-amber-500/50" : "border-border"
                    )}
                />
                {unit ? <span className="text-[10px] text-muted-foreground min-w-[28px]">{unit}</span> : null}
            </div>
        </div>
    );
}

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
