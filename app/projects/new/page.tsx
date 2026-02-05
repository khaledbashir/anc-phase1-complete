"use client";

import { useEffect } from "react";
import ProposalPage from "@/app/components/ProposalPage";
import { useProposalContext } from "@/contexts/ProposalContext";

export default function NewProjectPage() {
    const { newProposal } = useProposalContext();

    useEffect(() => {
        newProposal({ silent: true });
    }, [newProposal]);

    return <ProposalPage projectId="new" />;
}
