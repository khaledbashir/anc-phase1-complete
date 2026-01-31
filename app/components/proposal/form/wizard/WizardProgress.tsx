"use client";

import React from "react";

// RHF
import { useFormContext } from "react-hook-form";

// React Wizard
import { WizardValues } from "react-use-wizard";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

// Types
import { ProposalType, WizardStepType } from "@/types";
import { useDebouncedSave } from "@/app/hooks/useDebouncedSave";

// Utils
import { cn } from "@/lib/utils";

// Icons
import { Check } from "lucide-react";

type WizardStepperProps = {
    wizard: WizardValues;
};

/**
 * WizardStepper - Horizontal breadcrumb-style progress indicator
 * 
 * Design: Imperial Blue (#0A52EF) for active step
 * Refined Rolls-Royce labels with proper alignment
 */
const WizardStepper = ({ wizard }: WizardStepperProps) => {
    const { activeStep, stepCount } = wizard;

    const {
        formState: { errors },
    } = useFormContext<ProposalType>();

    const { _t } = useTranslationContext();

    const step1Valid = !errors.sender && !errors.receiver;
    const step2Valid =
        !errors.details?.proposalNumber &&
        !errors.details?.dueDate &&
        !errors.details?.proposalDate &&
        !errors.details?.currency;
    const step3Valid = !errors.details?.items;
    const step4Valid = !errors.details?.paymentInformation;

    const steps: WizardStepType[] = [
        { id: 0, label: "Setup", isValid: step1Valid },
        { id: 1, label: "Configure", isValid: step2Valid },
        { id: 2, label: "Math", isValid: step3Valid },
        { id: 3, label: "Review", isValid: step4Valid },
    ];

    const { saveToDb } = useDebouncedSave();

    const handleStepChange = async (stepId: number) => {
        saveToDb();
        wizard.goToStep(stepId);
    };

    return (
        <div className="w-full px-4 py-2">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
                {steps.map((step, idx) => {
                    const isActive = activeStep === step.id;
                    const isPassed = activeStep > step.id;
                    const isError = !step.isValid && isPassed;

                    return (
                        <React.Fragment key={step.id}>
                            {/* Step Circle + Label */}
                            <button
                                type="button"
                                onClick={() => handleStepChange(step.id)}
                                className="flex flex-col items-center gap-2 group relative z-10"
                            >
                                {/* Circle */}
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm",
                                        isActive && "bg-[#0A52EF] text-white ring-4 ring-[#0A52EF]/20 scale-110",
                                        isPassed && !isError && "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                                        isError && "bg-red-500/10 text-red-500 border border-red-500/20",
                                        !isActive && !isPassed && "bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:border-zinc-700 group-hover:text-zinc-400"
                                    )}
                                >
                                    {isPassed && !isError ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        step.id + 1
                                    )}
                                </div>

                                {/* Label */}
                                <span
                                    className={cn(
                                        "text-[9px] uppercase tracking-[0.2em] font-black transition-colors flex flex-col items-center",
                                        isActive ? "text-[#0A52EF]" : "text-zinc-500",
                                        isPassed && "text-emerald-500"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </button>

                            {/* Connecting Line */}
                            {idx < steps.length - 1 && (
                                <div
                                    className={cn(
                                        "flex-1 h-[1px] mx-4 transition-colors relative -top-3",
                                        activeStep > idx ? "bg-emerald-500/30" : "bg-zinc-800"
                                    )}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default WizardStepper;

// Also export the old name for backwards compat
export { WizardStepper as WizardProgress };
