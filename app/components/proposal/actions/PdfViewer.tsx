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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";

/** Stable fingerprint of form data so we only regenerate PDF when data actually changed. */
function getPdfFingerprint(data: ProposalType): string {
    try {
        const d = data?.details ?? {};
        const screens = (d.screens ?? []).map((s: any) => ({
            name: s?.name,
            externalName: s?.externalName,
            customDisplayName: s?.customDisplayName,
            heightFt: s?.heightFt ?? s?.height,
            widthFt: s?.widthFt ?? s?.width,
            quantity: s?.quantity,
            pitchMm: s?.pitchMm ?? s?.pixelPitch,
            costPerSqFt: s?.costPerSqFt,
            desiredMargin: s?.desiredMargin,
            brightness: s?.brightness ?? s?.brightnessNits,
        }));
        const r = data?.receiver ?? {};
        return JSON.stringify({
            proposalId: d.proposalId,
            documentMode: d.documentMode,
            paymentTerms: (d.paymentTerms ?? "").slice(0, 200),
            additionalNotes: (d.additionalNotes ?? "").slice(0, 200),
            customProposalNotes: (d.customProposalNotes ?? "").slice(0, 200),
            showSpecifications: d.showSpecifications,
            showExhibitA: d.showExhibitA,
            showExhibitB: d.showExhibitB,
            showPaymentTerms: d.showPaymentTerms,
            showSignatureBlock: d.showSignatureBlock,
            showPricingTables: d.showPricingTables,
            receiverName: r.name,
            receiverAddress: r.address,
            receiverCity: r.city,
            receiverZip: r.zipCode,
            screens,
        });
    } catch {
        return "";
    }
}

/**
 * PdfViewer - Live PDF Preview
 *
 * Always shows the live preview using DynamicProposalTemplate.
 * The preview updates in real-time as the user edits the form.
 * No redundant FinalPdf component - export actions are in Step4Export.
 */
const PdfViewer = () => {
    const { watch } = useFormContext<ProposalType>();
    const formValues = watch();
    const { generatePdf, proposalPdfLoading, pdfUrl, excelPreview } = useProposalContext();
    const [exactPdfPreview, setExactPdfPreview] = useState(false);
    const lastGeneratedFingerprint = useRef<string>("");
    const isGenerating = useRef(false);

    // Store generatePdf in a ref so it doesn't cause effect re-runs
    const generatePdfRef = useRef(generatePdf);
    generatePdfRef.current = generatePdf;

    const debounceMs = useMemo(() => (exactPdfPreview ? 2500 : 300), [exactPdfPreview]);
    const [debouncedValues] = useDebounce(formValues, debounceMs);

    // Cast to any to accept the custom prop without TS errors
    const Template = DynamicProposalTemplate as any;

    // Memoized fingerprint to avoid recalculating on every render
    const currentFingerprint = useMemo(() => getPdfFingerprint(debouncedValues), [debouncedValues]);

    // Only trigger generation when fingerprint actually changes and we're in exact mode
    useEffect(() => {
        if (!exactPdfPreview) {
            lastGeneratedFingerprint.current = "";
            isGenerating.current = false;
            return;
        }

        // Skip if already generating or fingerprint hasn't changed
        if (isGenerating.current) return;
        if (currentFingerprint === lastGeneratedFingerprint.current) return;

        // Mark as generating and store fingerprint BEFORE calling
        isGenerating.current = true;
        lastGeneratedFingerprint.current = currentFingerprint;

        generatePdfRef.current(debouncedValues).finally(() => {
            isGenerating.current = false;
        });
    }, [currentFingerprint, exactPdfPreview, debouncedValues]);

    return (
        <div className="w-full h-full flex flex-col items-center">
            <div className="w-full shrink-0 px-4 py-3 border-b border-border bg-background/60 flex items-center justify-between">
                <div className="text-xs font-semibold tracking-wide">
                    {exactPdfPreview ? "Exact PDF Preview" : "Live Preview"}
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-[11px] text-muted-foreground">Exact PDF</div>
                    <Switch checked={exactPdfPreview} onCheckedChange={setExactPdfPreview} />
                </div>
            </div>

            <div className="w-full flex-1 min-h-0">
                {exactPdfPreview ? (
                    pdfUrl ? (
                        <iframe className="w-full h-full" src={pdfUrl} title="PDF Preview" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                            {proposalPdfLoading ? "Generating PDF..." : "PDF preview will appear after generation."}
                        </div>
                    )
                ) : Template ? (
                    (() => {
                        if (!excelPreview) {
                            return (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-muted/20 rounded-xl border border-dashed border-border">
                                    <p className="text-sm font-medium text-foreground">Live Preview</p>
                                    <p className="text-xs text-muted-foreground mt-2 max-w-[220px]">Upload an Excel file to see your proposal preview here.</p>
                                </div>
                            );
                        }
                        return <Template {...debouncedValues} />;
                    })()
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                        Generator Loading...
                    </div>
                )}
            </div>
        </div>
    );
};

export default PdfViewer;
