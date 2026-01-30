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
 * Design: French Blue (#0A52EF) for active step
 * Full-width stepper with numbered circles and connecting lines
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
        { id: 2, label: "Review", isValid: step3Valid },
        { id: 3, label: "Export", isValid: step4Valid },
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
                                className="flex flex-col items-center gap-2 group"
                            >
                                {/* Circle */}
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200",
                                        isActive && "bg-[#0A52EF] text-white ring-4 ring-[#0A52EF]/30",
                                        isPassed && !isError && "bg-emerald-500 text-white",
                                        isError && "bg-red-500 text-white",
                                        !isActive && !isPassed && "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700"
                                    )}
                                >
                                    {isPassed && !isError ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        step.id + 1
                                    )}
                                </div>

                                {/* Label */}
                                <span
                                    className={cn(
                                        "text-xs font-medium transition-colors",
                                        isActive && "text-[#0A52EF]",
                                        isPassed && "text-emerald-400",
                                        !isActive && !isPassed && "text-zinc-500 group-hover:text-zinc-300"
                                    )}
                                >
                                    {step.label}
                                </span>
                            </button>

                            {/* Connecting Line */}
                            {idx < steps.length - 1 && (
                                <div
                                    className={cn(
                                        "flex-1 h-0.5 mx-3 transition-colors",
                                        activeStep > idx ? "bg-emerald-500" : "bg-zinc-700"
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
