"use client";

import React, { useState } from "react";

// RHF
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

// Components
import { BaseButton, Subheading } from "@/app/components";
import SingleScreen from "../SingleScreen";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";
import { useProposalContext } from "@/contexts/ProposalContext";

// Icons
import { Plus, Settings2, ChevronDown, ChevronUp } from "lucide-react";

// Toast
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { ProposalType } from "@/types";

const Screens = () => {
    const { control, getValues, setValue } = useFormContext<ProposalType>();
    const { _t } = useTranslationContext();
    
    // Single accordion state for all document settings
    const [showDocSettings, setShowDocSettings] = useState(false);
    
    // Watch current values
    const paymentTerms = useWatch({ control, name: "details.paymentTerms" }) || "";
    const additionalNotes = useWatch({ control, name: "details.additionalNotes" }) || "";
    const scopeOfWorkText = useWatch({ control, name: "details.scopeOfWorkText" }) || "";
    const signatureBlockText = useWatch({ control, name: "details.signatureBlockText" }) || "";
    const specsSectionTitle = useWatch({ control, name: "details.specsSectionTitle" }) || "";
    
    // Count how many fields have custom content
    const customFieldsCount = [
        specsSectionTitle,
        paymentTerms,
        additionalNotes,
        scopeOfWorkText,
        signatureBlockText
    ].filter(Boolean).length;
    
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
        const screens = getValues(SCREENS_NAME);
        if (!screens) return;
        
        const deletedScreen = screens[index];
        remove(index);

        toast({
            title: "Screen removed",
            description: `"${deletedScreen?.name || 'Untitled Screen'}" has been deleted.`,
            action: (
                <ToastAction 
                    altText="Undo"
                    onClick={() => {
                        append(deletedScreen, { shouldFocus: false });
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

            {/* Single Clean Accordion for Document Settings */}
            <div className="mt-4">
                <button
                    type="button"
                    onClick={() => setShowDocSettings(!showDocSettings)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/50 hover:bg-muted border border-border rounded-lg text-foreground text-sm transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Document Text Settings</span>
                        {customFieldsCount > 0 && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">
                                {customFieldsCount} customized
                            </span>
                        )}
                    </div>
                    {showDocSettings ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                
                {showDocSettings && (
                    <div className="mt-2 p-4 bg-card border border-border rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Specs Section Title */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Specs Header <span className="text-[10px] opacity-70">(Budget/Proposal)</span>
                            </Label>
                            <input
                                type="text"
                                placeholder="SPECIFICATIONS"
                                value={specsSectionTitle}
                                onChange={(e) => setValue("details.specsSectionTitle", e.target.value, { shouldDirty: true })}
                                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
                            />
                        </div>

                        {/* Payment Terms */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Payment Terms <span className="text-[10px] opacity-70">(LOI only)</span>
                            </Label>
                            <Textarea
                                placeholder="50% on Deposit, 40% on Mobilization, 10% on Substantial Completion"
                                value={paymentTerms}
                                onChange={(e) => setValue("details.paymentTerms", e.target.value, { shouldDirty: true })}
                                className="min-h-[60px] text-sm bg-background border-border resize-none"
                            />
                        </div>

                        {/* Additional Notes */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Additional Notes <span className="text-[10px] opacity-70">(LOI only)</span>
                            </Label>
                            <Textarea
                                placeholder="Any additional notes or terms..."
                                value={additionalNotes}
                                onChange={(e) => setValue("details.additionalNotes", e.target.value, { shouldDirty: true })}
                                className="min-h-[60px] text-sm bg-background border-border resize-none"
                            />
                        </div>

                        {/* Scope of Work */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Scope of Work <span className="text-[10px] opacity-70">(LOI Exhibit B - optional)</span>
                            </Label>
                            <Textarea
                                placeholder="Custom scope of work text... Leave empty to hide Exhibit B."
                                value={scopeOfWorkText}
                                onChange={(e) => setValue("details.scopeOfWorkText", e.target.value, { shouldDirty: true })}
                                className="min-h-[80px] text-sm bg-background border-border resize-none font-mono"
                            />
                        </div>

                        {/* Signature Legal Text */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    Signature Legal Text <span className="text-[10px] opacity-70">(LOI only)</span>
                                </Label>
                                {!signatureBlockText && (
                                    <button
                                        type="button"
                                        onClick={() => setValue("details.signatureBlockText", defaultSignatureText, { shouldDirty: true })}
                                        className="text-[10px] text-primary hover:underline"
                                    >
                                        Load default
                                    </button>
                                )}
                            </div>
                            <Textarea
                                placeholder="Please sign below to indicate Purchaser's agreement..."
                                value={signatureBlockText}
                                onChange={(e) => setValue("details.signatureBlockText", e.target.value, { shouldDirty: true })}
                                className="min-h-[80px] text-sm bg-background border-border resize-none"
                            />
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default Screens;
