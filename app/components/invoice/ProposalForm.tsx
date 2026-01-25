"use client";

import { useMemo } from "react";

// RHF
import { useFormContext, useWatch } from "react-hook-form";

// ShadCn
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// React Wizard
import { Wizard } from "react-use-wizard";

// Components
import {
    WizardStep,
    BillFromSection,
    BillToSection,
    ProposalDetails,
    Items,
    PaymentInformation,
    ProposalSummary,
} from "@/app/components";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";

const ProposalForm = () => {
    const { _t } = useTranslationContext();

    const { control } = useFormContext();

    // Get proposal ID variable
    const proposalId = useWatch({
        name: "details.proposalId",
        control,
    });

    const proposalIdLabel = useMemo(() => {
        if (proposalId) {
            return `#${proposalId}`;
        } else {
            return _t("formNewPropBadge");
        }
    }, [proposalId]);

    return (
        <div className="w-full">
            <Card>
                <CardHeader>
                    <div className="flex gap-3">
                        <CardTitle className="flex items-center gap-3">
                            <span className="uppercase">
                                {_t("form.title")}
                            </span>
                        </CardTitle>
                        <Badge variant="secondary" className="w-fit">
                            <p style={{ fontSize: "14px" }}>
                                {proposalIdLabel}
                            </p>
                        </Badge>
                    </div>
                    <CardDescription>{_t("form.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        <Wizard>
                            <WizardStep>
                                <div className="flex gap-x-20 gap-y-10">
                                    <BillFromSection />

                                    <BillToSection />
                                </div>
                            </WizardStep>
                            <WizardStep>
                                <div className="flex flex-wrap gap-y-10">
                                    <ProposalDetails />
                                </div>
                            </WizardStep>

                            <WizardStep>
                                <Screens />
                            </WizardStep>

                            <WizardStep>
                                <Items />
                            </WizardStep>

                            <WizardStep>
                                <PaymentInformation />
                            </WizardStep>

                            <WizardStep>
                                <ProposalSummary />
                            </WizardStep>
                        </Wizard>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProposalForm;
