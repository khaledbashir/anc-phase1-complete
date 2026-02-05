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
        // ALWAYS reset when landing on /projects/new — no conditions.
        // This must fire before Providers' draft hydration (child effects fire first)
        // and clears localStorage so parent hydration finds nothing.
        newProposal({ silent: true });
    }, [newProposal]);

    return <ProposalPage projectId="new" />;
}
