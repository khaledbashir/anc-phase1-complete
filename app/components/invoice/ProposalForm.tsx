"use client";

import { useMemo } from "react";
import { Wizard } from "react-use-wizard";
import { useFormContext, useWatch } from "react-hook-form";

// Components
import { WizardStep } from "@/app/components";
import {
    Step1Ingestion,
    Step2Intelligence,
    Step3Math,
    Step4Export
} from "@/app/components/invoice/form/wizard/steps";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

const ProposalForm = () => {
    const { proposalIdLabel } = useProposalLabel();

    // Header component just for the badge
    const Header = () => (
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-zinc-800/50 text-zinc-300 border border-zinc-700 px-3 py-1 rounded text-sm font-medium">
                {proposalIdLabel}
            </div>
            {/* Auto-save indicator is global in Navbar, but we can put a local one here if needed */}
        </div>
    );

    return (
        <div className="w-full space-y-4">
            <Header />

            <div className="w-full">
                <Wizard>
                    <WizardStep>
                        <Step1Ingestion />
                    </WizardStep>
                    <WizardStep>
                        <Step2Intelligence />
                    </WizardStep>
                    <WizardStep>
                        <Step3Math />
                    </WizardStep>
                    <WizardStep>
                        <Step4Export />
                    </WizardStep>
                </Wizard>
            </div>
        </div>
    );
};

// Helper hook for the label
const useProposalLabel = () => {
    const { _t } = useTranslationContext();
    const { control } = useFormContext();
    const proposalId = useWatch({
        name: "details.proposalId",
        control,
    });

    const proposalIdLabel = useMemo(() => {
        if (proposalId && proposalId !== 'new') {
            return `#${proposalId}`;
        } else {
            return _t("form.newPropBadge");
        }
    }, [proposalId, _t]);

    return { proposalIdLabel };
};

export default ProposalForm;
