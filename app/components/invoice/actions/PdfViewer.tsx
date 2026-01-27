"use client";

// RHF
import { useFormContext } from "react-hook-form";

// Components
import { DynamicProposalTemplate } from "@/app/components";

// Contexts
import { useProposalContext } from "@/contexts/ProposalContext";

// Types
import { ProposalType } from "@/types";

// Debounce
import { useDebounce } from "use-debounce";

/**
 * PdfViewer - Live PDF Preview
 * 
 * Always shows the live preview using DynamicProposalTemplate.
 * The preview updates in real-time as the user edits the form.
 * No redundant FinalPdf component - export actions are in Step4Export.
 */
const PdfViewer = () => {
    const { watch } = useFormContext<ProposalType>();

    // Use a shorter debounce so preview feels snappy
    const [debouncedWatch] = useDebounce(watch, 300);
    const formValues = debouncedWatch();

    // Enterprise Template 2 uses a Blue header, so we force the White Logo.
    const forceWhiteLogo = formValues.details?.pdfTemplate === 2;

    // Cast to any to accept the custom prop without TS errors
    const Template = DynamicProposalTemplate as any;

    return (
        <div className="my-3">
            <div className="w-full rounded-lg shadow-2xl bg-white min-h-[1000px] relative">
                <div
                    className="h-full w-full overflow-y-auto rounded-xl bg-white shadow-xl ring-1 ring-gray-900/5"
                    style={{
                        aspectRatio: "210/297", // A4 aspect ratio
                    }}
                >
                    {Template ? (
                        <Template
                            {...formValues}
                            forceWhiteLogo={forceWhiteLogo}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            Generator Loading...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PdfViewer;
