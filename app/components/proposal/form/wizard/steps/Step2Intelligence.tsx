"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Calculator, Info, ChevronDown, ChevronUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Screens } from "@/app/components";
import { Badge } from "@/components/ui/badge";
import { useProposalContext } from "@/contexts/ProposalContext";
import { resolveDocumentMode } from "@/lib/documentMode";
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
    const { setValue, control } = useFormContext<ProposalType>();
    const pricingDocument = useWatch({ name: "details.pricingDocument" as any, control });
    const masterTableIndex = useWatch({ name: "details.masterTableIndex" as any, control });

    const tables = (pricingDocument as any)?.tables || [];

    // Auto-detect: if first table name contains "TOTAL", pre-select it (only on initial null)
    useEffect(() => {
        if (tables.length > 0 && masterTableIndex === undefined) {
            const firstName = ((tables[0] as any)?.name || "").toString();
            if (/total/i.test(firstName)) {
                setValue("details.masterTableIndex" as any, 0, { shouldDirty: false });
            }
        }
    }, [tables, masterTableIndex, setValue]);

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
                    setValue("details.masterTableIndex" as any, idx === -1 ? null : idx, { shouldDirty: true });
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

const Step2Intelligence = () => {
    const { aiWorkspaceSlug } = useProposalContext();
    const { control } = useFormContext();
    const screens = useWatch({
        name: "details.screens",
        control
    }) || [];
    const details = useWatch({ name: "details", control });
    const mirrorMode = useWatch({ name: "details.mirrorMode", control });
    const mode = resolveDocumentMode(details);

    const screenCount = screens.length;
    const hasData = aiWorkspaceSlug || screenCount > 0;
    
    // Intelligence section collapsed by default
    const [showIntelligence, setShowIntelligence] = useState(false);

    return (
        <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Collapsible Intelligence Briefing - Hidden by default */}
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

            {/* Document Mode + Master Table Selector */}
            <div className="flex flex-col gap-3 px-4 py-3 rounded-lg border border-border bg-card/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground">Document Mode:</span>
                        <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                            mode === "BUDGET" ? "bg-amber-500/20 text-amber-400" :
                            mode === "PROPOSAL" ? "bg-[#0A52EF]/20 text-[#0A52EF]" :
                            "bg-emerald-500/20 text-emerald-400"
                        }`}>
                            {mode === "BUDGET" ? "Budget" : mode === "PROPOSAL" ? "Proposal" : "LOI"}
                        </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                        {mode === "BUDGET" && "Non-binding estimate"}
                        {mode === "PROPOSAL" && "Formal quote"}
                        {mode === "LOI" && "Legal contract"}
                    </span>
                </div>
                {/* Prompt 51: Master Table Selector */}
                <MasterTableSelector />
            </div>

            {/* AI-Generated SOW Panel - Intelligence Mode only */}
            {!mirrorMode && <SOWGeneratorPanel />}

            {/* Main Screens Card - Takes up most space */}
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
        </div>
    );
};

export default Step2Intelligence;
