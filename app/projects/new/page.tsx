"use client";

import { useEffect } from "react";
import ProposalPage from "@/app/components/ProposalPage";
import { useProposalContext } from "@/contexts/ProposalContext";
import { useFormContext } from "react-hook-form";
import type { ProposalType } from "@/types";

export default function NewProjectPage() {
    const { newProposal } = useProposalContext();
    const { getValues } = useFormContext<ProposalType>();

    useEffect(() => {
        const currentProposalId = (getValues("details.proposalId") ?? "").toString().trim();
        if (currentProposalId) {
            newProposal({ silent: true });
        }
    }, [getValues, newProposal]);

    return <ProposalPage projectId="new" />;
}
