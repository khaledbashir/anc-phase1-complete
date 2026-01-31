"use client";

import React, { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useWizard } from "react-use-wizard";
import { Download, Share2, Upload, Loader2, CheckCircle2, FileSpreadsheet, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    /** When "new", show "Create project first" banner and Save Draft (creates project). */
    projectId?: string;
}

export function StudioHeader({
    saveStatus,
    initialData,
    excelImportLoading,
    onImportExcel,
    onExportPdf,
    projectId,
}: StudioHeaderProps) {
    const wizard = useWizard();
    const { control, getValues } = useFormContext<ProposalType>();
    const { excelValidationOk, exportAudit, saveDraft } = useProposalContext();
    const [savingDraft, setSavingDraft] = useState(false);
    const isNewProject = !projectId || projectId === "new";
    
    // Watch form values for real-time gap analysis
    const formValues = useWatch({ control });

    // Check for Empty/Reset State to ensure correct completion rate
    const isDefaultClient = !formValues?.receiver?.name || formValues?.receiver?.name === "Client Name";
    const isNoScreens = (formValues?.details?.screens || []).length === 0;
    const isNoProjectName = !formValues?.details?.proposalName;
    const isEmptyState = isDefaultClient && isNoScreens && isNoProjectName;

    const gaps = analyzeGaps(formValues);
    // If empty state, force 0% completion instead of 100% (since gaps is empty array)
    const completionRate = isEmptyState ? 0 : calculateCompletionRate(gaps.length);

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

    const handleSaveDraft = async () => {
        setSavingDraft(true);
        try {
            const result = await saveDraft();
            if (result.created && result.projectId) {
                toast({ title: "Project created", description: "Redirecting to your saved project…" });
                // Context already does router.push
            } else if (result.error) {
                toast({ title: "Save failed", description: result.error, variant: "destructive" });
            }
            // When created: false and no error, context already toasts "modified"
        } finally {
            setSavingDraft(false);
        }
    };

    return (
        <div className="h-full w-full flex items-center justify-between px-4 md:px-8 gap-4 bg-zinc-950 border-b border-zinc-900">
            {/* Logo & Health Score */}
            <div className="flex items-center shrink-0 gap-4 flex-1">
                <LogoSelector theme="dark" width={110} height={40} className="p-0" />
                
                <div className="hidden md:block h-8 w-px bg-zinc-800 mx-1" />
                
                <div className="hidden md:flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#0A52EF]/15 px-2.5 py-1 text-[10px] font-semibold text-brand-blue uppercase tracking-wide">
                        <CheckCircle2 className="w-3 h-3" />
                        {Math.round(completionRate)}% Match
                    </span>
                    {excelValidationOk && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
                            <CheckCircle2 className="w-3 h-3" />
                            Excel Verified
                        </span>
                    )}
                </div>
            </div>

            {/* Wizard Stepper (center-aligned) */}
            <div className="flex-1 flex justify-center max-w-xl hidden lg:flex">
                <WizardStepper wizard={wizard} />
            </div>

            {/* Right Actions - Global Controls */}
            <div className="flex items-center gap-3 shrink-0 flex-1 justify-end">
                <SaveIndicator
                    status={saveStatus}
                    lastSavedAt={initialData?.lastSavedAt ? new Date(initialData.lastSavedAt) : undefined}
                />

                {isNewProject ? (
                     <div className="flex items-center gap-2">
                        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-500 text-[10px] font-medium uppercase tracking-wide">
                            <AlertTriangle className="w-3 h-3" />
                            Draft Mode
                        </div>
                        <Button
                            size="sm"
                            onClick={handleSaveDraft}
                            disabled={savingDraft}
                            className="bg-[#0A52EF] hover:bg-[#0A52EF]/90 text-white font-bold uppercase tracking-widest text-[10px] px-4 h-8 shadow-lg shadow-blue-900/20"
                        >
                            {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                            Save Draft
                        </Button>
                    </div>
                ) : (
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-[#0A52EF]/40 text-[#0A52EF] hover:bg-[#0A52EF]/10 font-bold uppercase tracking-widest text-[10px] px-3 h-7"
                        onClick={handleSaveDraft}
                        disabled={savingDraft}
                    >
                        {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                        Save Draft
                    </Button>
                )}

                <div className="h-8 w-px bg-zinc-800 mx-2 hidden sm:block" />

                <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 p-1 rounded-lg">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-zinc-400 hover:text-white font-bold uppercase tracking-widest text-[10px] px-3 h-7"
                        onClick={handleShare}
                    >
                        <Share2 className="w-3.5 h-3.5 mr-2 text-brand-blue" />
                        Share
                    </Button>
                    
                    <div className="h-4 w-px bg-zinc-800" />
                    
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-zinc-400 hover:text-white font-bold uppercase tracking-widest text-[10px] px-3 h-7"
                        onClick={exportAudit}
                    >
                        <FileSpreadsheet className="w-3 h-3 mr-2 text-emerald-500" />
                        Audit
                    </Button>
                </div>
            </div>
        </div>
    );
}
