"use client";

import { useLayoutEffect, useRef } from "react";
import ProposalPage from "@/app/components/ProposalPage";
import { useProposalContext } from "@/contexts/ProposalContext";

export default function NewProjectPage() {
    const { newProposal } = useProposalContext();
    const hasReset = useRef(false);

    // Run BEFORE paint so user never sees old draft (useLayoutEffect)
    useLayoutEffect(() => {
        if (hasReset.current) return;
        hasReset.current = true;
        newProposal({ silent: true });
    }, [newProposal]);

    return <ProposalPage projectId="new" />;
}
