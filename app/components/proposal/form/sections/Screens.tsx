"use client";

import React, { useState } from "react";

// RHF
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

// Components
import { BaseButton, Subheading } from "@/app/components";
import SingleScreen from "../SingleScreen";
import { Textarea } from "@/components/ui/textarea";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";
import { useProposalContext } from "@/contexts/ProposalContext";

// Icons
import { Plus, FileText, CreditCard, ChevronDown, ChevronUp, ClipboardList, PenTool } from "lucide-react";

// Toast
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { ProposalType } from "@/types";

const Screens = () => {
    const { control, getValues, setValue } = useFormContext<ProposalType>();
    const { _t } = useTranslationContext();
    
    // Track which sections are expanded
    const [showPaymentTerms, setShowPaymentTerms] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [showScopeOfWork, setShowScopeOfWork] = useState(false);
    const [showSignatureText, setShowSignatureText] = useState(false);
    
    // Watch current values
    const paymentTerms = useWatch({ control, name: "details.paymentTerms" }) || "";
    const additionalNotes = useWatch({ control, name: "details.additionalNotes" }) || "";
    const scopeOfWorkText = useWatch({ control, name: "details.scopeOfWorkText" }) || "";
    const signatureBlockText = useWatch({ control, name: "details.signatureBlockText" }) || "";
    
    // Default legal text for signature block
    const defaultSignatureText = `Please sign below to indicate Purchaser's agreement to purchase the Display System as described herein and to authorize ANC to commence production.

If, for any reason, Purchaser terminates this Agreement prior to the completion of the work, ANC will immediately cease all work and Purchaser will pay ANC for any work performed, work in progress, and materials purchased, if any. This document will be considered binding on both parties; however, it will be followed by a formal agreement containing standard contract language, including terms of liability, indemnification, and warranty. Payment is due within thirty (30) days of ANC's invoice(s).`;

    const SCREENS_NAME = "details.screens";
    const { fields, append, remove, move } = useFieldArray({
        control: control,
        name: SCREENS_NAME,
    });

    const addNewScreen = () => {
        append({
            name: "",
            productType: "",
            widthFt: 0,
            heightFt: 0,
            quantity: 1,
            pitchMm: 10,
            costPerSqFt: 120,
            desiredMargin: 0.25,
            isReplacement: false,
            useExistingStructure: false,
            includeSpareParts: false,
        });
    };

    const removeScreen = (index: number) => {
        // Store the screen data for potential undo
        const screens = getValues(SCREENS_NAME);
        if (!screens) return;
        
        const deletedScreen = screens[index];

        // Remove the screen
        remove(index);

        // Show toast with undo action
        toast({
            title: "Screen removed",
            description: `"${deletedScreen?.name || 'Untitled Screen'}" has been deleted.`,
            action: (
                <ToastAction 
                    altText="Undo"
                    onClick={() => {
                        // Restore the screen at the original index
                        append(deletedScreen, { shouldFocus: false });
                        // Move it back to the original position if needed
                        const currentScreens = getValues(SCREENS_NAME);
                        if (currentScreens && index < currentScreens.length - 1) {
                            move(currentScreens.length - 1, index);
                        }
                    }}
                >
                    Undo
                </ToastAction>
            ),
        });
    };

    const moveScreenUp = (index: number) => {
        if (index > 0) move(index, index - 1);
    };

    const moveScreenDown = (index: number) => {
        if (index < fields.length - 1) move(index, index + 1);
    };

    const { duplicateScreen } = useProposalContext();
    const screens = getValues(SCREENS_NAME) || [];
    const mirrorMode = !!getValues("details.mirrorMode");
    const optionIndices = screens
        .map((s: any, idx: number) => {
            const name = (s?.name ?? "").toString().trim().toUpperCase();
            const w = Number(s?.widthFt ?? s?.width ?? 0);
            const h = Number(s?.heightFt ?? s?.height ?? 0);
            const isOptionPlaceholder = name.includes("OPTION") && (w <= 0 || h <= 0);
            return isOptionPlaceholder ? idx : -1;
        })
        .filter((idx: number) => idx >= 0);

    return (
        <section className="flex flex-col gap-2 w-full">
            <Subheading>{_t("form.steps.screens.heading")}:</Subheading>

            {mirrorMode && optionIndices.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-amber-200 uppercase tracking-widest">OPTION placeholder detected</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                            This is a header/placeholder row from the estimator sheet, not a real screen.
                        </div>
                    </div>
                    <BaseButton tooltipLabel="Remove placeholder rows" onClick={() => remove(optionIndices)} className="shrink-0">
                        Remove
                    </BaseButton>
                </div>
            )}

            <div className="space-y-3">
                {fields.map((field, index) => (
                    <SingleScreen
                        key={field.id}
                        name={SCREENS_NAME}
                        index={index}
                        fields={fields as any}
                        field={field as any}
                        moveFieldUp={moveScreenUp}
                        moveFieldDown={moveScreenDown}
                        removeField={removeScreen}
                        duplicateField={duplicateScreen}
                    />
                ))}
            </div>

            <BaseButton tooltipLabel="Add a new screen" onClick={addNewScreen}>
                <Plus />
                {_t("form.steps.screens.addNewScreen")}
            </BaseButton>

            {/* Divider */}
            <div className="border-t border-border/50 my-4" />

            {/* Payment Terms Section */}
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setShowPaymentTerms(!showPaymentTerms)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-500 font-bold text-sm transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Payment Terms</span>
                        {paymentTerms && <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded">Has content</span>}
                    </div>
                    {showPaymentTerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showPaymentTerms && (
                    <div className="px-4 py-3 bg-card/50 border border-border rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Textarea
                            placeholder="e.g., 50% on Deposit, 40% on Mobilization, 10% on Substantial Completion"
                            value={paymentTerms}
                            onChange={(e) => setValue("details.paymentTerms", e.target.value, { shouldDirty: true })}
                            className="min-h-[80px] text-sm bg-background border-border"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            <span className="text-emerald-500 font-semibold">LOI only</span> — Payment milestones appear in the LOI document
                        </p>
                    </div>
                )}
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setShowNotes(!showNotes)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-500 font-bold text-sm transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>Additional Notes</span>
                        {additionalNotes && <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded">Has content</span>}
                    </div>
                    {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showNotes && (
                    <div className="px-4 py-3 bg-card/50 border border-border rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Textarea
                            placeholder="Any additional notes, terms, or conditions..."
                            value={additionalNotes}
                            onChange={(e) => setValue("details.additionalNotes", e.target.value, { shouldDirty: true })}
                            className="min-h-[100px] text-sm bg-background border-border"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            <span className="text-blue-500 font-semibold">LOI only</span> — Notes appear in the Legal Notes section of the LOI
                        </p>
                    </div>
                )}
            </div>

            {/* Scope of Work Section (Exhibit B) */}
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setShowScopeOfWork(!showScopeOfWork)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-500 font-bold text-sm transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        <span>Scope of Work (Exhibit B)</span>
                        {scopeOfWorkText && <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded">Has content</span>}
                    </div>
                    {showScopeOfWork ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showScopeOfWork && (
                    <div className="px-4 py-3 bg-card/50 border border-border rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Textarea
                            placeholder="Enter custom Scope of Work text for Exhibit B...

Example:
1. PHYSICAL INSTALLATION
ANC assumes all base building structure is to be provided by others...

2. ELECTRICAL & DATA INSTALLATION
ANC assumes primary power feed will be provided by others..."
                            value={scopeOfWorkText}
                            onChange={(e) => setValue("details.scopeOfWorkText", e.target.value, { shouldDirty: true })}
                            className="min-h-[200px] text-sm bg-background border-border font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            <span className="text-purple-500 font-semibold">LOI only</span> — If empty, Exhibit B will not appear in the PDF. Add text to include a custom Scope of Work.
                        </p>
                    </div>
                )}
            </div>

            {/* Signature Block Text (Legal Text) */}
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setShowSignatureText(!showSignatureText)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-500 font-bold text-sm transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <PenTool className="w-4 h-4" />
                        <span>Signature Legal Text</span>
                        {signatureBlockText && <span className="text-[10px] bg-orange-500/20 px-2 py-0.5 rounded">Custom</span>}
                    </div>
                    {showSignatureText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showSignatureText && (
                    <div className="px-4 py-3 bg-card/50 border border-border rounded-xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Textarea
                            placeholder={defaultSignatureText}
                            value={signatureBlockText}
                            onChange={(e) => setValue("details.signatureBlockText", e.target.value, { shouldDirty: true })}
                            className="min-h-[150px] text-sm bg-background border-border"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            <span className="text-orange-500 font-semibold">LOI only</span> — The legal text that appears above signature lines. Leave empty to use default text.
                        </p>
                        {!signatureBlockText && (
                            <button
                                type="button"
                                onClick={() => setValue("details.signatureBlockText", defaultSignatureText, { shouldDirty: true })}
                                className="text-xs text-orange-500 hover:text-orange-400 underline"
                            >
                                Click to load default text for editing
                            </button>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Screens;
