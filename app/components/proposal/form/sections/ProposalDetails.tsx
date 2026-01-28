"use client";

// Components
import {
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

const ProposalDetails = () => {
    const { _t } = useTranslationContext();

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
                        name="details.documentType"
                        label="Document Purpose"
                        options={[
                            { label: "LOI", value: "LOI" },
                            { label: "First Round (Proposal/Budget)", value: "First Round" },
                        ]}
                    />
                    <FormSelect
                        name="details.pricingType"
                        label="Pricing Round"
                        options={[
                            { label: "Hard Quoted", value: "Hard Quoted" },
                            { label: "Budget", value: "Budget" },
                        ]}
                    />
                    <TemplateSelector />
                </div>
            </div>
        </section>
    );
};

export default ProposalDetails;
