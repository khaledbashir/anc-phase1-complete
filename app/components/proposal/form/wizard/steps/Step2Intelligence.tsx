"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Calculator, Info, ChevronDown, ChevronUp, RotateCcw, Tv, ClipboardList, EyeOff, Eye } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Screens } from "@/app/components";
import PricingTableEditor from "@/app/components/proposal/form/sections/PricingTableEditor";
import SchedulePreview from "@/app/components/proposal/form/sections/SchedulePreview";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useProposalContext } from "@/contexts/ProposalContext";
import { resolveDocumentMode, forceDocumentModeDefaults, type DocumentMode } from "@/lib/documentMode";
import { EmbeddingStatusBanner } from "@/app/components/proposal/form/wizard/EmbeddingStatusBanner";
import { SOWGeneratorPanel } from "@/app/components/proposal/SOWGeneratorPanel";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ProposalType } from "@/types";

/**
 * Master Table Selector — Prompt 51
 * Lets user designate which pricingDocument.tables entry is the "Project Grand Total"
 * so it renders at the top of the document.
 */
const MasterTableSelector = () => {
    const { setValue, control, getFieldState, formState } = useFormContext<ProposalType>();
    const pricingDocument = useWatch({ name: "details.pricingDocument" as any, control });
    const masterTableIndex = useWatch({ name: "details.masterTableIndex" as any, control });

    const tables = useMemo(() => (pricingDocument as any)?.tables || [], [pricingDocument]);

    // Auto-detect: scan ALL tables for a summary/roll-up name, not just the first one
    useEffect(() => {
        const fieldState = getFieldState("details.masterTableIndex" as any, formState);
        if (fieldState.isDirty) return;
        if (tables.length > 0 && masterTableIndex == null) {
            const rollUpRegex = /\b(total|roll.?up|summary|project\s+grand|grand\s+total|project\s+total|cost\s+summary|pricing\s+summary|roll.?up\s+summary)\b/i;
            const matchIdx = tables.findIndex((t: any) => rollUpRegex.test(((t as any)?.name || "").toString()));
            if (matchIdx >= 0) {
                setValue("details.masterTableIndex" as any, matchIdx, { shouldDirty: false });
            }
        }
    }, [tables, masterTableIndex, setValue, getFieldState, formState]);

    // Don't render if no pricing tables
    if (tables.length === 0) return null;

    const options = useMemo(() => {
        const opts = [{ label: "None (no master table)", value: "-1" }];
        tables.forEach((t: any, idx: number) => {
            const name = (t?.name || `Table ${idx + 1}`).toString().trim();
            opts.push({ label: name, value: String(idx) });
        });
        return opts;
    }, [tables]);

    const currentValue = masterTableIndex != null ? String(masterTableIndex) : "-1";

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-medium text-muted-foreground">Project Grand Total Table</label>
            <Select
                value={currentValue}
                onValueChange={(val) => {
                    const idx = parseInt(val, 10);
                    setValue("details.masterTableIndex" as any, idx, { shouldDirty: true });
                }}
            >
                <SelectTrigger className="w-full bg-card border-border text-sm text-foreground">
                    <SelectValue placeholder="Select master table" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                    {options.map((opt) => (
                        <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-foreground focus:bg-muted focus:text-foreground"
                        >
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground">This table will appear at the top of the document as the Project Summary</span>
        </div>
    );
};

/** Default ANC responsibility matrix for LOI documents (Intelligence Mode). */
const DEFAULT_RESP_MATRIX = {
    projectName: "",
    date: "",
    format: "long" as const,
    categories: [
        {
            name: "Physical Installation",
            items: [
                { description: "LED Panel Mounting & Alignment", anc: "X", purchaser: "" },
                { description: "Secondary Steel / Structural Support", anc: "X", purchaser: "" },
                { description: "Electrical Infrastructure to Display", anc: "X", purchaser: "" },
                { description: "Low Voltage Cabling & Connectivity", anc: "X", purchaser: "" },
                { description: "Demolition of Existing Displays", anc: "X", purchaser: "" },
            ],
        },
        {
            name: "Electrical & Power",
            items: [
                { description: "Dedicated Circuits to Display Location", anc: "", purchaser: "X" },
                { description: "Main Power Distribution Panel", anc: "", purchaser: "X" },
                { description: "Power Wiring from Panel to Displays", anc: "X", purchaser: "" },
            ],
        },
        {
            name: "Control & Integration",
            items: [
                { description: "Control Room Equipment & Setup", anc: "X", purchaser: "" },
                { description: "Content Management System", anc: "X", purchaser: "" },
                { description: "Network Infrastructure to Control Room", anc: "", purchaser: "X" },
                { description: "Third-Party System Integration", anc: "", purchaser: "X" },
            ],
        },
        {
            name: "Project Management",
            items: [
                { description: "ANC Project Manager (On-site)", anc: "X", purchaser: "" },
                { description: "Design & Engineering Submittals", anc: "X", purchaser: "" },
                { description: "Owner Review & Approval of Submittals", anc: "", purchaser: "X" },
                { description: "Permitting & Code Compliance", anc: "", purchaser: "X" },
                { description: "Site Access & Coordination", anc: "", purchaser: "X" },
            ],
        },
        {
            name: "Post-Installation",
            items: [
                { description: "System Testing & Commissioning", anc: "X", purchaser: "" },
                { description: "Training — Operations & Maintenance", anc: "X", purchaser: "" },
                { description: "Warranty Support (Parts & Labor)", anc: "X", purchaser: "" },
                { description: "Spare Parts Package", anc: "X", purchaser: "" },
            ],
        },
    ],
};

const Step2Intelligence = () => {
    const { aiWorkspaceSlug } = useProposalContext();
    const { control, setValue, getValues, register, watch } = useFormContext();
    const watchedScreens = useWatch({
        name: "details.screens",
        control
    });
    const screens = useMemo(() => (Array.isArray(watchedScreens) ? watchedScreens : []), [watchedScreens]);
    const details = useWatch({ name: "details", control });
    const ntpDate = useWatch({ name: "details.ntpDate", control });
    const mirrorModeFlag = useWatch({ name: "details.mirrorMode", control });
    const pricingDocument = useWatch({ name: "details.pricingDocument" as any, control });
    const mirrorMode =
        mirrorModeFlag === true || ((pricingDocument as any)?.tables?.length ?? 0) > 0;
    const mode = resolveDocumentMode(details);

    const screenCount = screens.length;
    const hasData = aiWorkspaceSlug || screenCount > 0;
    const [originalScreenDetails, setOriginalScreenDetails] = useState<Record<string, { displayName: string; brightness: number | string | "" }>>({});

    // RFP Filter: get projectId for embedding status polling
    const proposalId = useWatch({ name: "details.proposalId" as any, control }) as string | undefined;
    const source = useWatch({ name: "details.source" as any, control }) as string | undefined;
    const isFromFilter = source === "rfp_filter";

    // Intelligence section collapsed by default
    const [showIntelligence, setShowIntelligence] = useState(false);

    useEffect(() => {
        if (!Array.isArray(screens) || screens.length === 0) return;

        setOriginalScreenDetails((prev) => {
            const next = { ...prev };
            (screens as any[]).forEach((screen: any, idx: number) => {
                const key = screen?.id ? `id:${screen.id}` : `idx:${idx}`;
                if (next[key]) return;

                const originalDisplayName = (
                    screen?.externalName ||
                    screen?.name ||
                    `Screen ${idx + 1}`
                ).toString().trim();
                const originalBrightness = screen?.brightnessNits ?? screen?.nits ?? screen?.brightness ?? "";

                next[key] = {
                    displayName: originalDisplayName,
                    brightness: originalBrightness,
                };
            });
            return next;
        });
    }, [screens]);

    // Shared Document Mode Selector (used by both modes)
    const handleModeChange = (newMode: DocumentMode) => {
        setValue("details.documentMode", newMode, { shouldDirty: true });
        const currentDetails = getValues("details") as any;
        const updated = forceDocumentModeDefaults(newMode, currentDetails);
        const desiredDocumentType = newMode === "LOI" ? "LOI" : "First Round";
        const desiredPricingType = newMode === "PROPOSAL" ? "Hard Quoted" : "Budget";
        if (currentDetails?.documentType !== desiredDocumentType) {
            setValue("details.documentType", desiredDocumentType as any, { shouldDirty: true });
        }
        if (currentDetails?.pricingType !== desiredPricingType) {
            setValue("details.pricingType", desiredPricingType as any, { shouldDirty: true });
        }
        for (const [key, value] of Object.entries(updated)) {
            if (key.startsWith("show") && currentDetails?.[key] !== value) {
                setValue(`details.${key}` as any, value, { shouldDirty: true });
            }
        }
    };

    const DocumentModeSelector = (
        <div className="flex flex-col gap-3 px-4 py-3 rounded-lg border border-border bg-card/50">
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Document Mode</label>
                    <span className="text-[10px] text-muted-foreground">
                        {mode === "BUDGET" && "Non-binding estimate"}
                        {mode === "PROPOSAL" && "Formal quote"}
                        {mode === "LOI" && "Legal contract"}
                    </span>
                </div>
                <Select
                    value={mode}
                    onValueChange={(val) => handleModeChange(val as DocumentMode)}
                >
                    <SelectTrigger className={`w-full text-sm font-semibold border-border ${mode === "BUDGET" ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                            mode === "PROPOSAL" ? "bg-[#0A52EF]/10 text-[#0A52EF] border-[#0A52EF]/30" :
                                "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        }`}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="BUDGET" className="text-foreground focus:bg-muted focus:text-foreground">Budget</SelectItem>
                        <SelectItem value="PROPOSAL" className="text-foreground focus:bg-muted focus:text-foreground">Proposal</SelectItem>
                        <SelectItem value="LOI" className="text-foreground focus:bg-muted focus:text-foreground">LOI</SelectItem>
                    </SelectContent>
                </Select>
                {mode === "BUDGET" && (
                    <div className="flex gap-2">
                        <button type="button" className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                            onClick={() => handleModeChange("PROPOSAL")}>
                            Promote to Proposal
                        </button>
                        <button type="button" className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                            onClick={() => handleModeChange("LOI")}>
                            Promote to LOI
                        </button>
                    </div>
                )}
                {mode === "PROPOSAL" && (
                    <button type="button" className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-colors w-fit"
                        onClick={() => handleModeChange("LOI")}>
                        Promote to LOI
                    </button>
                )}
            </div>

            {/* Mirror Mode only: Master Table */}
            {mirrorMode && (
                <>
                    <MasterTableSelector />
                </>
            )}

            {/* Page Layout Selector */}
            <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-medium text-muted-foreground">Page Layout</label>
                <Select
                    value={(details as any)?.pageLayout || "portrait-letter"}
                    onValueChange={(val) => {
                        setValue("details.pageLayout" as any, val, { shouldDirty: true });
                    }}
                >
                    <SelectTrigger className="w-full bg-card border-border text-sm text-foreground">
                        <SelectValue placeholder="Select page layout" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="portrait-letter" className="text-foreground focus:bg-muted focus:text-foreground">Portrait — Letter</SelectItem>
                        <SelectItem value="portrait-legal" className="text-foreground focus:bg-muted focus:text-foreground">Portrait — Legal</SelectItem>
                        <SelectItem value="portrait-a4" className="text-foreground focus:bg-muted focus:text-foreground">Portrait — A4</SelectItem>
                        <SelectItem value="landscape-letter" className="text-foreground focus:bg-muted focus:text-foreground">Landscape — Letter</SelectItem>
                        <SelectItem value="landscape-legal" className="text-foreground focus:bg-muted focus:text-foreground">Landscape — Legal</SelectItem>
                        <SelectItem value="landscape-a4" className="text-foreground focus:bg-muted focus:text-foreground">Landscape — A4</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground">
                    {((details as any)?.pageLayout || "portrait-letter").startsWith("landscape")
                        ? "Landscape: pricing sections render two per row"
                        : "Standard single-column layout"}
                </span>
            </div>
        </div>
    );

    if (mirrorMode) {
        // ═══ MIRROR MODE: Configure ═══
        // Pricing editor first (most important), then doc mode, custom text, brightness per screen
        return (
            <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Pricing Line Items — primary editing surface for Mirror Mode */}
                <PricingTableEditor />

                {DocumentModeSelector}

                {/* Custom Intro / Notes */}
                <div className="flex flex-col gap-3 px-4 py-3 rounded-lg border border-border bg-card/50">
                    <label className="text-xs font-medium text-muted-foreground">Custom Introduction Text</label>
                    <textarea
                        {...register("details.additionalNotes" as any)}
                        placeholder="Add custom introduction or notes for this document..."
                        className="w-full min-h-[80px] px-3 py-2 text-sm bg-background border border-input rounded-md resize-y focus:ring-1 focus:ring-[#0A52EF] focus:outline-none"
                    />
                </div>

                {/* Payment Terms (LOI only) */}
                {mode === "LOI" && (
                    <div className="flex flex-col gap-3 px-4 py-3 rounded-lg border border-border bg-card/50">
                        <label className="text-xs font-medium text-muted-foreground">Payment Terms</label>
                        <textarea
                            {...register("details.paymentTerms" as any)}
                            placeholder="e.g., 50% on Deposit, 40% on Mobilization, 10% on Substantial Completion"
                            className="w-full min-h-[60px] px-3 py-2 text-sm bg-background border border-input rounded-md resize-y focus:ring-1 focus:ring-[#0A52EF] focus:outline-none"
                        />
                    </div>
                )}

                {/* Responsibility Matrix toggle (LOI default on, others off) */}
                {mode === "LOI" && (
                    <div className="flex flex-col gap-2 px-4 py-3 rounded-lg border border-border bg-card/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-2">
                                <ClipboardList className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-semibold text-foreground">Include Responsibility Matrix</h4>
                                    <p className="text-xs text-muted-foreground">Statement of Work — who is responsible for each task</p>
                                </div>
                            </div>
                            <Switch
                                checked={watch("details.includeResponsibilityMatrix" as any) !== false}
                                onCheckedChange={(checked) => {
                                    setValue("details.includeResponsibilityMatrix" as any, checked, { shouldDirty: true });
                                    if (checked && !watch("details.responsibilityMatrix" as any)) {
                                        setValue("details.responsibilityMatrix" as any, DEFAULT_RESP_MATRIX, { shouldDirty: true });
                                    }
                                }}
                                className="data-[state=checked]:bg-brand-blue"
                            />
                        </div>
                        {watch("details.includeResponsibilityMatrix" as any) !== false && (
                            <div className="flex items-center gap-2 pl-6">
                                <span className="text-[11px] text-muted-foreground">Format:</span>
                                <Select
                                    value={watch("details.respMatrixFormatOverride" as any) || "auto"}
                                    onValueChange={(val) => setValue("details.respMatrixFormatOverride" as any, val, { shouldDirty: true })}
                                >
                                    <SelectTrigger className="h-7 w-[130px] text-[11px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Auto-detect</SelectItem>
                                        <SelectItem value="short">Short (paragraphs)</SelectItem>
                                        <SelectItem value="long">Long (table)</SelectItem>
                                        <SelectItem value="hybrid">Hybrid (mixed)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                )}

                {/* Brightness Editor — minimal per-screen brightness input */}
                {screenCount > 0 && (
                    <div className="flex flex-col gap-3 px-4 py-3 rounded-lg border border-border bg-card/50">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-start gap-2">
                                <Tv className="w-4 h-4 text-muted-foreground mt-0.5" />
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-semibold text-foreground">
                                        Screen Details for Exhibit A
                                        {(() => {
                                            const hiddenCount = (screens as any[]).filter((s: any) => s?.hiddenFromSpecs).length;
                                            return hiddenCount > 0 ? (
                                                <span className="ml-2 text-[11px] font-normal text-amber-600">
                                                    ({hiddenCount} hidden)
                                                </span>
                                            ) : null;
                                        })()}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">Edit display names and brightness for the specs table</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    (screens as any[]).forEach((screen: any, idx: number) => {
                                        const key = screen?.id ? `id:${screen.id}` : `idx:${idx}`;
                                        const original = originalScreenDetails[key];
                                        const originalBrightness = original?.brightness ?? "";
                                        setValue(`details.screens.${idx}.customDisplayName` as any, "", { shouldDirty: true, shouldValidate: true });
                                        setValue(`details.screens.${idx}.brightness` as any, originalBrightness, { shouldDirty: true, shouldValidate: true });
                                        setValue(`details.screens.${idx}.hiddenFromSpecs` as any, false, { shouldDirty: true, shouldValidate: true });
                                    });
                                }}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset All
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_10rem_auto_auto] gap-3 px-1">
                                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Display Name</span>
                                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Brightness (nits)</span>
                                <span />
                                <span />
                            </div>

                            {(screens as any[]).map((screen: any, idx: number) => {
                                const key = screen?.id ? `id:${screen.id}` : `idx:${idx}`;
                                const original = originalScreenDetails[key];
                                const fallbackName = (original?.displayName || screen?.externalName || screen?.name || `Screen ${idx + 1}`).toString();
                                const customDisplayName = (screen?.customDisplayName || "").toString();
                                const currentDisplayName = customDisplayName.trim() !== "" ? customDisplayName : fallbackName;
                                const isNameEdited = customDisplayName.trim() !== "" && customDisplayName.trim() !== fallbackName.trim();
                                const isHidden = screen?.hiddenFromSpecs === true;

                                return (
                                    <div key={key} className={`rounded-md border p-3 transition-colors ${isHidden ? "border-border/40 bg-muted/30 opacity-50" : "border-border/70 bg-background/40"}`}>
                                        <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_10rem_auto_auto] gap-2 md:gap-3 items-start">
                                            <input
                                                type="text"
                                                value={currentDisplayName}
                                                disabled={isHidden}
                                                onChange={(e) => {
                                                    const nextValue = e.target.value;
                                                    const normalized = nextValue.trim();
                                                    const shouldClearOverride = normalized === "" || normalized === fallbackName.trim();
                                                    setValue(
                                                        `details.screens.${idx}.customDisplayName` as any,
                                                        shouldClearOverride ? "" : nextValue,
                                                        { shouldDirty: true, shouldValidate: true }
                                                    );
                                                }}
                                                className={`w-full h-9 px-3 text-sm border rounded-md focus:ring-1 focus:ring-[#0A52EF] focus:outline-none ${isHidden ? "bg-muted text-muted-foreground line-through border-border/50" : "bg-background border-input"}`}
                                            />
                                            <input
                                                type="number"
                                                placeholder="e.g., 6000"
                                                value={screen?.brightness ?? ""}
                                                disabled={isHidden}
                                                onChange={(e) => {
                                                    const nextValue = e.target.value;
                                                    setValue(
                                                        `details.screens.${idx}.brightness` as any,
                                                        nextValue === "" ? "" : Number(nextValue),
                                                        { shouldDirty: true, shouldValidate: true }
                                                    );
                                                }}
                                                className={`w-full h-9 px-3 text-sm border rounded-md focus:ring-1 focus:ring-[#0A52EF] focus:outline-none ${isHidden ? "bg-muted text-muted-foreground border-border/50" : "bg-background border-input"}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const originalBrightness = original?.brightness ?? "";
                                                    setValue(`details.screens.${idx}.customDisplayName` as any, "", { shouldDirty: true, shouldValidate: true });
                                                    setValue(`details.screens.${idx}.brightness` as any, originalBrightness, { shouldDirty: true, shouldValidate: true });
                                                }}
                                                className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                                                title="Reset this screen"
                                                aria-label="Reset this screen"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setValue(
                                                        `details.screens.${idx}.hiddenFromSpecs` as any,
                                                        !isHidden,
                                                        { shouldDirty: true, shouldValidate: true }
                                                    );
                                                }}
                                                className={`inline-flex items-center justify-center h-9 w-9 rounded-md border transition-colors ${isHidden ? "border-amber-300 text-amber-500 hover:text-amber-600 hover:border-amber-400 bg-amber-50" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
                                                title={isHidden ? "Show in specs table" : "Hide from specs table"}
                                                aria-label={isHidden ? "Show in specs table" : "Hide from specs table"}
                                            >
                                                {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>

                                        {isNameEdited && !isHidden && (
                                            <p className="mt-2 text-[11px] text-muted-foreground truncate">
                                                Original: {fallbackName}
                                            </p>
                                        )}
                                        {isHidden && (
                                            <p className="mt-2 text-[11px] text-amber-600">
                                                Hidden from Exhibit A specs table
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ═══ INTELLIGENCE MODE: Configure ═══
    // Screen cards, SOW, doc mode (no master table, no column headers)
    return (
        <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* RFP Filter: Embedding pipeline status */}
            {isFromFilter && proposalId && proposalId !== "new" && (
                <EmbeddingStatusBanner projectId={proposalId} />
            )}

            {/* Collapsible Intelligence Briefing */}
            {hasData && (
                <div className="border border-border rounded-lg overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowIntelligence(!showIntelligence)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">Screen Configuration</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-brand-blue/30 text-brand-blue">
                                {screenCount} screen{screenCount !== 1 ? "s" : ""}
                            </Badge>
                        </div>
                        {showIntelligence ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                    </button>

                    {showIntelligence && (
                        <div className="p-4 bg-card border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
                            <p className="text-sm text-foreground leading-relaxed">
                                {aiWorkspaceSlug ? (
                                    <>Analyzed uploaded documents and extracted <strong>{screenCount} video screens</strong>.</>
                                ) : (
                                    <>Detected <strong>{screenCount} screen configurations</strong> in your draft.</>
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Edit screens below to customize specifications and pricing.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {DocumentModeSelector}

            {/* AI-Generated SOW Panel - Intelligence Mode only */}
            <SOWGeneratorPanel />

            {/* Main Screens Card */}
            <Card className="bg-card/50 border-border flex-1 flex flex-col overflow-hidden">
                <CardHeader className="pb-3 shrink-0 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-brand-blue/20">
                                <Calculator className="w-5 h-5 text-brand-blue" />
                            </div>
                            <div>
                                <CardTitle className="text-foreground text-base">Screen Configurations</CardTitle>
                                <CardDescription className="text-muted-foreground text-xs">Define specs for the display system</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
                            <Info className="w-3 h-3" />
                            Auto-syncing to PDF
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                    <div className="p-6">
                        <Screens />
                    </div>
                </CardContent>
            </Card>

            {ntpDate && (
                <SchedulePreview />
            )}
        </div>
    );
};

export default Step2Intelligence;
