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
    const { watch } = useFormContext<ProposalType>();

    // Watch client name to enable Next step from Step 1
    const clientName = watch("receiver.name");
    const isNextDisabled = isLastStep || (isFirstStep && !clientName);

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
                onClick={nextStep}
            >
                {_t("form.wizard.next")}
                <ArrowRight />
            </BaseButton>
        </div>
    );
};

export default WizardNavigation;
