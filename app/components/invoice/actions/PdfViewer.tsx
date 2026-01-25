"use client";

// Debounce
import { useDebounce } from "use-debounce";

// RHF
import { useFormContext } from "react-hook-form";

// Components
import { FinalPdf, LivePreview } from "@/app/components";

// Contexts
import { useProposalContext } from "@/contexts/ProposalContext";

// Types
import { InvoiceType } from "@/types";

const PdfViewer = () => {
    const { proposalPdf } = useProposalContext();

    const { watch } = useFormContext<InvoiceType>();

    const [debouncedWatch] = useDebounce(watch, 1000);
    const formValues = debouncedWatch();

    return (
        <div className="my-3">
            {proposalPdf.size == 0 ? (
                <LivePreview data={formValues} />
            ) : (
                <FinalPdf />
            )}
        </div>
    );
};

export default PdfViewer;
