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

    // CRITICAL: Move template selection logic BEFORE any early returns
    // to ensure consistent hook call order (Rules of Hooks compliance)
    const rawId = props.details?.pdfTemplate || 2;
    const templateId = rawId === 1 ? 2 : rawId;
    const templateName = `ProposalTemplate${templateId}`;

    // Hook MUST be called on every render, not conditionally
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

    // NOW safe to do conditional rendering (after all hooks)
    if (useMirrorMode && pricingDocument) {
        return <NataliaMirrorTemplate {...props} />;
    }

    return <DynamicProposal {...props} />;
};

export default DynamicProposalTemplate;
