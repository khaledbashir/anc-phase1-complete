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
    const templateName = `ProposalTemplate${props.details.pdfTemplate}`;

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
