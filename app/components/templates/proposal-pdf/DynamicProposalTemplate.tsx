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

const DynamicProposalTemplate = (props: ProposalType) => {
    // Dynamic template component name
    const rawId = props.details?.pdfTemplate || 2;
    // REQ-Fix: ProposalTemplate1 does not exist, map 1 -> 2
    const templateId = rawId === 1 ? 2 : rawId;
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
