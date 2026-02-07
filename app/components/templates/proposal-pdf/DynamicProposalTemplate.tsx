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
 * Dynamic template selector — detects Mirror Mode vs Hybrid.
 *
 * Mirror Mode: pricingDocument.tables exists → NataliaMirrorTemplate
 * Otherwise:   ProposalTemplate5 (Hybrid) for Budget, Proposal, LOI
 *
 * Must match the same detection logic as generateProposalPdfServiceV2.ts
 */
const DynamicProposalTemplate = (props: ProposalType) => {
    // Mirror Mode detection — same logic as PDF generation service
    const isMirrorMode =
        (props.details as any)?.mirrorMode === true ||
        (((props.details as any)?.pricingDocument?.tables || []) as any[]).length > 0;

    const templateName = useMemo(() => {
        if (isMirrorMode) return "NataliaMirrorTemplate";
        const rawId = props.details?.pdfTemplate || 5;
        const DEPRECATED_TEMPLATES = [1, 2, 3, 4];
        const templateId = DEPRECATED_TEMPLATES.includes(rawId) ? 5 : rawId;
        return `ProposalTemplate${templateId}`;
    }, [isMirrorMode, props.details?.pdfTemplate]);

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
