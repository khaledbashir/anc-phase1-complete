"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useWizard } from "react-use-wizard";
import { Download, Share2, Upload, Loader2, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LogoSelector from "@/app/components/reusables/LogoSelector";
import SaveIndicator from "@/app/components/reusables/SaveIndicator";
import WizardStepper from "@/app/components/proposal/form/wizard/WizardProgress";
import { useProposalContext } from "@/contexts/ProposalContext";
import { ProposalType } from "@/types";
import { analyzeGaps, calculateCompletionRate } from "@/lib/gap-analysis";
import { toast } from "@/components/ui/use-toast";
import type { AutoSaveStatus } from "@/lib/useAutoSave";

interface StudioHeaderProps {
    saveStatus: AutoSaveStatus;
    initialData?: any;
    excelImportLoading: boolean;
    onImportExcel: (file: File) => void;
    onExportPdf: () => void;
}

export function StudioHeader({
    saveStatus,
    initialData,
    excelImportLoading,
    onImportExcel,
    onExportPdf,
}: StudioHeaderProps) {
    const wizard = useWizard();
    const { control, getValues } = useFormContext<ProposalType>();
    const { excelValidationOk, exportAudit } = useProposalContext();
    
    // Watch form values for real-time gap analysis
    const formValues = useWatch({ control });
    const gaps = analyzeGaps(formValues);
    const completionRate = calculateCompletionRate(gaps.length);

    const handleShare = async () => {
        const projectId = getValues("details.proposalId");
        if (!projectId || projectId === "new") {
            toast({
                title: "Save Project First",
                description: "You must save the project before generating a share link.",
                variant: "destructive"
            });
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectId}/share`, {
                method: "POST"
            });
            const data = await response.json();
            
            if (data.shareUrl) {
                await navigator.clipboard.writeText(data.shareUrl);
                toast({
                    title: "Share Link Copied",
                    description: "The professional 'Ferrari-grade' link is now in your clipboard.",
                });
            }
        } catch (e) {
            toast({
                title: "Share Failed",
                description: "Could not generate share link. Please try again.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="h-full w-full flex items-center justify-between px-8">
            {/* Logo & Health Score */}
            <div className="flex items-center shrink-0 w-80 gap-4">
                <LogoSelector theme="dark" width={110} height={40} className="p-0" />
                
                <div className="h-8 w-px bg-zinc-800 mx-1" />
                
                <Badge
                    className="bg-[#0A52EF] hover:bg-[#0A52EF]/90 text-white font-['Work_Sans'] border-none px-3 py-1 flex items-center gap-2"
                >
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                        Bid Health: {Math.round(completionRate)}%
                    </span>
                </Badge>

                {excelValidationOk && (
                    <Badge
                        className="bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-300 font-['Work_Sans'] border border-emerald-500/20 px-3 py-1 flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                            Excel Verified
                        </span>
                    </Badge>
                )}
            </div>

            {/* Wizard Stepper (center-aligned) */}
            <div className="flex-1 flex justify-center max-w-2xl">
                <WizardStepper wizard={wizard} />
            </div>

            {/* Right Actions - Global Controls */}
            <div className="flex items-center gap-3 shrink-0 w-80 justify-end">
                <SaveIndicator
                    status={saveStatus}
                    lastSavedAt={initialData?.lastSavedAt ? new Date(initialData.lastSavedAt) : undefined}
                />

                <div className="h-8 w-px bg-zinc-800 mx-2" />

                <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold uppercase tracking-widest text-[10px] px-3 h-9"
                    onClick={handleShare}
                >
                    <Share2 className="w-3.5 h-3.5 mr-2 text-brand-blue" />
                    Share Link
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold uppercase tracking-widest text-[10px] px-3 h-9"
                    onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.xlsx, .xls';
                        input.onchange = (e: any) => {
                            const file = e.target.files?.[0];
                            if (file) onImportExcel(file);
                        };
                        input.click();
                    }}
                    disabled={excelImportLoading}
                >
                    {excelImportLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Upload className="w-3 h-3 mr-2 text-brand-blue" />}
                    Import
                </Button>

                <Button
                    size="sm"
                    onClick={onExportPdf}
                    className="bg-brand-blue hover:bg-brand-blue/90 text-white font-bold h-9 px-4 rounded-lg transition-all shadow-lg shadow-brand-blue/20 active:scale-[0.98] uppercase tracking-wider text-[10px]"
                >
                    <Download className="w-3.5 h-3.5 mr-2" />
                    PDF
                </Button>

                <Button
                    size="sm"
                    variant="outline"
                    className="border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold uppercase tracking-widest text-[10px] px-3 h-9"
                    onClick={exportAudit}
                >
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                    Audit
                </Button>
            </div>
        </div>
    );
}
