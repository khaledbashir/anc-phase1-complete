"use client";

import { useEffect } from "react";

// Components
import {
    BaseButton,
    CurrencySelector,
    DatePickerFormField,
    FormInput,
    FormFile,
    Subheading,
    TemplateSelector,
} from "@/app/components";
import FormSelect from "../../../reusables/form-fields/FormSelect";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";
import { useFormContext, useWatch } from "react-hook-form";
import type { ProposalType } from "@/types";
import { applyDocumentModeDefaults, resolveDocumentMode, type DocumentMode } from "@/lib/documentMode";

const ProposalDetails = () => {
    const { _t } = useTranslationContext();
    const { getValues, setValue, control } = useFormContext<ProposalType>();
    const rawMode = useWatch({ name: "details.documentMode", control }) as DocumentMode | undefined;
    const details = useWatch({ name: "details", control });
    const mode = rawMode || resolveDocumentMode(details);

    useEffect(() => {
        const nextMode = (rawMode || resolveDocumentMode(getValues("details"))) as DocumentMode;
        const currentDetails = getValues("details") as any;
        const isHydrating = !currentDetails?.documentMode;
        const setOpts = isHydrating ? { shouldDirty: false } : { shouldDirty: true };
        const updated = applyDocumentModeDefaults(nextMode, currentDetails);
        const desiredDocumentType = nextMode === "LOI" ? "LOI" : "First Round";
        const desiredPricingType = nextMode === "PROPOSAL" ? "Hard Quoted" : "Budget";

        if (currentDetails?.documentMode !== nextMode) {
            setValue("details.documentMode", nextMode, setOpts);
        }
        if (currentDetails?.documentType !== desiredDocumentType) {
            setValue("details.documentType", desiredDocumentType as any, setOpts);
        }
        if (currentDetails?.pricingType !== desiredPricingType) {
            setValue("details.pricingType", desiredPricingType as any, setOpts);
        }

        const updates: Array<[any, any]> = [
            ["details.showPaymentTerms", updated.showPaymentTerms],
            ["details.showSignatureBlock", updated.showSignatureBlock],
            ["details.showExhibitA", updated.showExhibitA],
            ["details.showExhibitB", updated.showExhibitB],
            ["details.showSpecifications", updated.showSpecifications],
        ];

        for (const [path, value] of updates) {
            const key = (path as string).split(".").slice(-1)[0];
            if (currentDetails?.[key] !== value) {
                setValue(path, value, setOpts);
            }
        }
    }, [getValues, rawMode, setValue]);

    return (
        <section className="flex flex-col flex-wrap gap-5">
            <Subheading>{_t("form.steps.proposalDetails.heading")}:</Subheading>

            <div className="flex flex-row flex-wrap gap-5">
                <div className="flex flex-col gap-2">
                    <FormFile
                        name="details.proposalLogo"
                        label={_t(
                            "form.steps.proposalDetails.proposalLogo.label"
                        )}
                        placeholder={_t(
                            "form.steps.proposalDetails.proposalLogo.placeholder"
                        )}
                    />

                    <FormInput
                        name="details.proposalId"
                        label={_t("form.steps.proposalDetails.proposalId")}
                        placeholder="Proposal ID"
                    />

                    <DatePickerFormField
                        name="details.proposalDate"
                        label={_t("form.steps.proposalDetails.issuedDate")}
                    />

                    <DatePickerFormField
                        name="details.dueDate"
                        label={_t("form.steps.proposalDetails.dueDate")}
                    />

                    <CurrencySelector
                        name="details.currency"
                        label={_t("form.steps.proposalDetails.currency")}
                        placeholder="Select Currency"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <FormSelect
                        name="details.documentMode"
                        label="Document Lifecycle"
                        options={[
                            { label: "Budget", value: "BUDGET" },
                            { label: "Proposal", value: "PROPOSAL" },
                            { label: "LOI", value: "LOI" },
                        ]}
                    />
                    <div className="flex flex-wrap gap-2">
                        {mode === "BUDGET" && (
                            <BaseButton
                                variant="outline"
                                size="sm"
                                onClick={() => setValue("details.documentMode", "PROPOSAL" as DocumentMode, { shouldDirty: true })}
                            >
                                Promote to Proposal
                            </BaseButton>
                        )}
                        {mode !== "LOI" && (
                            <BaseButton
                                variant="default"
                                size="sm"
                                onClick={() => setValue("details.documentMode", "LOI" as DocumentMode, { shouldDirty: true })}
                            >
                                Promote to LOI
                            </BaseButton>
                        )}
                    </div>
                    <TemplateSelector />
                </div>
            </div>
        </section>
    );
};

export default ProposalDetails;
