"use client";

// React Wizard
import { useWizard } from "react-use-wizard";

// Components
import { BaseButton } from "@/app/components";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

// Icons
import { ArrowLeft, ArrowRight } from "lucide-react";

// RHF
import { useFormContext } from "react-hook-form";

// Types
import { ProposalType } from "@/types";

const WizardNavigation = () => {
    const { isFirstStep, isLastStep, nextStep, previousStep, activeStep } = useWizard();
    const { watch, trigger } = useFormContext<ProposalType>();
    const [proposalName, receiverName] = watch(["details.proposalName", "receiver.name"]);
    const isStep1Ready = Boolean(proposalName?.toString().trim()) && Boolean(receiverName?.toString().trim());
    const isNextDisabled = isLastStep || (activeStep === 0 && !isStep1Ready);

    const handleNext = async () => {
        if (activeStep === 0) {
            const ok = await trigger(["details.proposalName", "receiver.name"]);
            if (!ok) return;
        }
        nextStep();
    };

    const { _t } = useTranslationContext();
    return (
        <div className="flex justify-end gap-5">
            {!isFirstStep && (
                <BaseButton
                    tooltipLabel="Go back to the previous step"
                    onClick={previousStep}
                >
                    <ArrowLeft />
                    {_t("form.wizard.back")}
                </BaseButton>
            )}
            <BaseButton
                tooltipLabel="Go to the next step"
                disabled={isNextDisabled}
                onClick={handleNext}
            >
                {_t("form.wizard.next")}
                <ArrowRight />
            </BaseButton>
        </div>
    );
};

export default WizardNavigation;
