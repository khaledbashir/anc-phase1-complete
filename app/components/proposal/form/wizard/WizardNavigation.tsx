"use client";

// React Wizard
import { useWizard } from "react-use-wizard";

// Components
import { BaseButton } from "@/app/components";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

// Icons
import { useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

// RHF
import { useFormContext, useWatch } from "react-hook-form";

// Types
import { ProposalType } from "@/types";

const WizardNavigation = () => {
    const { isFirstStep, isLastStep, nextStep, previousStep, activeStep, goToStep } = useWizard();
    const { watch, trigger, control } = useFormContext<ProposalType>();
    const [proposalName, receiverName] = watch(["details.proposalName", "receiver.name"]);
    const isStep1Ready = Boolean(proposalName?.toString().trim()) && Boolean(receiverName?.toString().trim());
    const mirrorModeFlag = useWatch({ name: "details.mirrorMode", control });
    const pricingDocument = useWatch({ name: "details.pricingDocument" as any, control });
    const isMirrorMode =
        mirrorModeFlag === true || ((pricingDocument as any)?.tables?.length ?? 0) > 0;

    useEffect(() => {
        if (isMirrorMode && activeStep === 2) {
            goToStep(3);
        }
    }, [isMirrorMode, activeStep, goToStep]);
    
    // Allow clicking next even if "disabled" to show error toast
    // But for visual feedback, we keep it enabled and handle validation in handleNext
    const isNextDisabled = isLastStep; 

    const handleNext = async () => {
        if (activeStep === 0) {
            const ok = await trigger(["details.proposalName", "receiver.name"]);
            if (!ok) {
                // Optional: Show toast here if you have a toast system
                return;
            }
        }
        if (isMirrorMode && activeStep === 1) {
            goToStep(3);
            return;
        }
        nextStep();
    };

    const { _t } = useTranslationContext();
    
    const nextTooltip = useMemo(() => {
        if (activeStep === 0 && !isStep1Ready) return "Please enter Project Name and Client Name to proceed";
        if (isLastStep) return "You are on the final step";
        return _t("form.wizard.next");
    }, [activeStep, isStep1Ready, isLastStep, _t]);

    return (
        <div className="flex justify-end gap-5">
            {!isFirstStep && (
                <BaseButton
                    tooltipLabel="Go back to the previous step"
                    onClick={() => {
                        if (isMirrorMode && activeStep === 3) {
                            goToStep(1);
                            return;
                        }
                        previousStep();
                    }}
                >
                    <ArrowLeft />
                    {_t("form.wizard.back")}
                </BaseButton>
            )}
            {!isLastStep && (
                <BaseButton
                    tooltipLabel={nextTooltip}
                    disabled={isNextDisabled}
                    onClick={handleNext}
                >
                    {_t("form.wizard.next")}
                    <ArrowRight />
                </BaseButton>
            )}
        </div>
    );
};

export default WizardNavigation;
