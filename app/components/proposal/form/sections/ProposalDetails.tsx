"use client";

import { useEffect, useMemo } from "react";

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Contexts
import { useTranslationContext } from "@/contexts/TranslationContext";
import { useFormContext, useWatch } from "react-hook-form";
import type { ProposalType } from "@/types";
import { applyDocumentModeDefaults, resolveDocumentMode, type DocumentMode } from "@/lib/documentMode";

/**
 * Master Table Selector — Prompt 51
 * Lets user designate which pricingDocument.tables entry is the "Project Grand Total"
 * so it renders at the top of the document.
 */
const MasterTableSelector = () => {
    const { setValue, control } = useFormContext<ProposalType>();
    const pricingDocument = useWatch({ name: "details.pricingDocument" as any, control });
    const masterTableIndex = useWatch({ name: "details.masterTableIndex" as any, control });

    const tables = (pricingDocument as any)?.tables || [];

    // Auto-detect: if first table name contains "TOTAL", pre-select it (only on initial null)
    useEffect(() => {
        if (tables.length > 0 && masterTableIndex === undefined) {
            const firstName = ((tables[0] as any)?.name || "").toString();
            if (/total/i.test(firstName)) {
                setValue("details.masterTableIndex" as any, 0, { shouldDirty: false });
            }
        }
    }, [tables, masterTableIndex, setValue]);

    // Don't render if no pricing tables
    if (tables.length === 0) return null;

    const options = useMemo(() => {
        const opts = [{ label: "None (no master table)", value: "-1" }];
        tables.forEach((t: any, idx: number) => {
            const name = (t?.name || `Table ${idx + 1}`).toString().trim();
            opts.push({ label: name, value: String(idx) });
        });
        return opts;
    }, [tables]);

    const currentValue = masterTableIndex != null ? String(masterTableIndex) : "-1";

    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-400">Project Grand Total Table:</label>
            <Select
                value={currentValue}
                onValueChange={(val) => {
                    const idx = parseInt(val, 10);
                    setValue("details.masterTableIndex" as any, idx === -1 ? null : idx, { shouldDirty: true });
                }}
            >
                <SelectTrigger className="w-full bg-zinc-950/50 border-zinc-800 text-sm">
                    <SelectValue placeholder="Select master table" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    {options.map((opt) => (
                        <SelectItem
                            key={opt.value}
                            value={opt.value}
                            className="text-zinc-100 focus:bg-zinc-800 focus:text-white"
                        >
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <span className="text-[10px] text-zinc-500">This table will appear at the top of the document as the Project Summary</span>
        </div>
    );
};

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
                    <MasterTableSelector />
                </div>
            </div>
        </section>
    );
};

export default ProposalDetails;
