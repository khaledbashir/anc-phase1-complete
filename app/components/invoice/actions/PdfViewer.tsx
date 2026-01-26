"use client";

// RHF
import { useFormContext } from "react-hook-form";

// Components
import { FinalPdf, DynamicProposalTemplate } from "@/app/components";

// Contexts
import { useProposalContext } from "@/contexts/ProposalContext";

// Types
import { ProposalType } from "@/types";

// Debounce
import { useDebounce } from "use-debounce";

const PdfViewer = () => {
    const { proposalPdf } = useProposalContext();

    const { watch } = useFormContext<ProposalType>();

    // Use a shorter debounce so preview feels snappy
    const [debouncedWatch] = useDebounce(watch, 300);
    const formValues = debouncedWatch();

    return (
        <div className="my-3">
            {proposalPdf.size == 0 ? (
                <div className="w-full overflow-hidden rounded-lg shadow-2xl">
                    <div className="origin-top transform scale-50 md:scale-50 lg:scale-75">
                        <DynamicProposalTemplate {...formValues} />
                    </div>
                </div>
            ) : (
                <FinalPdf />
            )}
        </div>
    );
};

export default PdfViewer;
