"use client";

import React from "react";

// RHF
import { useFormContext } from "react-hook-form";

// ShadCn
import { Card, CardContent } from "@/components/ui/card";

// Components
import { BaseButton } from "@/app/components";

// Contexts
import { useProposalContext } from "@/contexts/ProposalContext";

// Helpers
import { formatNumberWithCommas } from "@/lib/helpers";

// Variables
import { DATE_OPTIONS } from "@/lib/variables";

// Types
import { ProposalType } from "@/types";

type SavedProposalsListProps = {
    setModalState: React.Dispatch<React.SetStateAction<boolean>>;
};

const SavedProposalsList = ({ setModalState }: SavedProposalsListProps) => {
    const { savedProposals, onFormSubmit, deleteProposal } = useProposalContext();

    const { reset } = useFormContext<ProposalType>();

    // TODO: Remove "any" from the function below
    // Update fields when selected invoice is changed.
    // ? Reason: The fields don't go through validation when invoice loads
    const updateFields = (selected: any) => {
        // Next 2 lines are so that when invoice loads,
        // the dates won't be in the wrong format
        // ? Selected cannot be of type ProposalType because of these 2 variables
        selected.details.dueDate = new Date(selected.details.dueDate);
        selected.details.invoiceDate = new Date(selected.details.invoiceDate);

        selected.details.invoiceLogo = "";
        selected.details.signature = {
            data: "",
        };
    };

    /**
     * Transform date values for next submission
     *
    * @param {ProposalType} selected - The selected proposal
     */
    const transformDates = (selected: ProposalType) => {
        selected.details.dueDate = new Date(
            selected.details.dueDate
        ).toLocaleDateString("en-US", DATE_OPTIONS);
        selected.details.invoiceDate = new Date(
            selected.details.invoiceDate
        ).toLocaleDateString("en-US", DATE_OPTIONS);
    };

    /**
     * Loads a given invoice into the form.
     *
    * @param {ProposalType} selectedProposal - The selected proposal
     */
    const load = (selectedProposal: ProposalType) => {
        if (selectedProposal) {
            updateFields(selectedProposal);
            reset(selectedProposal);
            transformDates(selectedProposal);

            // Close modal
            setModalState(false);
        }
    };

    /**
     * Loads a given invoice into the form and generates a pdf by submitting the form.
     *
    * @param {ProposalType} selectedProposal - The selected proposal
     */
    const loadAndGeneratePdf = (selectedProposal: ProposalType) => {
        load(selectedProposal);

        // Submit form
        onFormSubmit(selectedProposal);
    };

    return (
        <>
            <div className="flex flex-col gap-5 overflow-y-auto max-h-72">
                {savedProposals.map((invoice, idx) => (
                    <Card
                        key={idx}
                        className="p-2 border rounded-sm hover:border-blue-500 hover:shadow-lg cursor-pointer"
                    // onClick={() => handleSelect(invoice)}
                    >
                        <CardContent className="flex justify-between">
                            <div>
                                {/* <FileText /> */}
                                <p className="font-semibold">
                                    Proposal #{invoice.details.invoiceNumber}{" "}
                                </p>
                                <small className="text-gray-500">
                                    Updated at: {invoice.details.updatedAt}
                                </small>

                                <div>
                                    <p>Sender: {invoice.sender.name}</p>
                                    <p>Receiver: {invoice.receiver.name}</p>
                                    <p>
                                        Total:{" "}
                                        <span className="font-semibold">
                                            {formatNumberWithCommas(
                                                Number(
                                                    invoice.details.totalAmount
                                                )
                                            )}{" "}
                                            {invoice.details.currency}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <BaseButton
                                    tooltipLabel="Load invoice details into the form"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => load(invoice)}
                                >
                                    Load
                                </BaseButton>

                                <BaseButton
                                    tooltipLabel="Load invoice and generate PDF"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadAndGeneratePdf(invoice)}
                                >
                                    Load & Generate
                                </BaseButton>
                                {/* Remove Invoice Button */}
                                <BaseButton
                                    variant="destructive"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteProposal(idx);
                                    }}
                                >
                                    Delete
                                </BaseButton>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {savedProposals.length == 0 && (
                    <div>
                        <p>No saved proposals</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default SavedProposalsList;
