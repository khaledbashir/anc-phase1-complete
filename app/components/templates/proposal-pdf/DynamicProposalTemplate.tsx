"use client";

// ShadCn
import { Skeleton } from "@/components/ui/skeleton";
// Types
import { ProposalType } from "@/types";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";

// Import NataliaMirrorTemplate statically for Mirror Mode
import NataliaMirrorTemplate from "./NataliaMirrorTemplate";

const DynamicProposalTemplateSkeleton = () => {
    return <Skeleton className="min-h-[60rem]" />;
};

const DynamicProposalTemplate = (props: ProposalType) => {
    // Check if Natalia Mirror Mode should be used
    const pricingDocument = (props.details as any)?.pricingDocument;
    const pricingMode = (props.details as any)?.pricingMode;
    const useMirrorMode = pricingDocument?.tables?.length > 0 || pricingMode === "MIRROR";

    // If Mirror Mode, use NataliaMirrorTemplate
    if (useMirrorMode && pricingDocument) {
        return <NataliaMirrorTemplate {...props} />;
    }

    // Otherwise, use standard template selection
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
