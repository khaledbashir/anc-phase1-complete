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
 * Always uses ProposalTemplate5 (Hybrid) — the enterprise-standard design.
 * Hybrid handles both Mirror Mode (pricingDocument.tables) and Intelligence Mode.
 */
const DynamicProposalTemplate = (props: ProposalType) => {
    const rawId = props.details?.pdfTemplate || 5;
    const DEPRECATED_TEMPLATES = [1, 2, 3, 4];
    const templateId = DEPRECATED_TEMPLATES.includes(rawId) ? 5 : rawId;
    if (rawId !== templateId) console.info(`[Template] Remapping deprecated template ${rawId} → ${templateId} (Hybrid)`);
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
