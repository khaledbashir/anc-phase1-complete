"use client";

// ShadCn
import { Skeleton } from "@/components/ui/skeleton";
// Types
import { ProposalType } from "@/types";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";

const DynamicProposalTemplateSkeleton = () => {
    return <Skeleton className="min-h-[60rem]" />;
};

/**
 * Single template: Hybrid (Template 5) for Budget, Proposal, and LOI.
 * Mirror template removed — Hybrid only.
 */
const DynamicProposalTemplate = (props: ProposalType) => {
    const rawId = props.details?.pdfTemplate || 5;
    const DEPRECATED_TEMPLATES = [1, 2, 3, 4];
    const templateId = DEPRECATED_TEMPLATES.includes(rawId) ? 5 : rawId;
    const templateName = `ProposalTemplate${templateId}`;

    const DynamicProposal = useMemo(
        () =>
            dynamic<ProposalType>(
                () =>
                    import(
                        `@/app/components/templates/proposal-pdf/${templateName}`
                    ),
                {
                    loading: () => <DynamicProposalTemplateSkeleton />,
                    ssr: false,
                }
            ),
        [templateName]
    );

    return <DynamicProposal {...props} />;
};

export default DynamicProposalTemplate;
