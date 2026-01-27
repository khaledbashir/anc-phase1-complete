"use client";

// ShadCn
import { AspectRatio } from "@/components/ui/aspect-ratio";

// Components
import { BaseButton, SendPdfToEmailModal, Subheading } from "@/app/components";

// Contexts
import { useProposalContext } from "@/contexts/ProposalContext";

// Icons
import {
    BookmarkIcon,
    DownloadCloudIcon,
    Eye,
    Mail,
    MoveLeft,
    Printer,
} from "lucide-react";

export default function FinalPdf() {
    const {
        pdfUrl,
        removeFinalPdf,
        previewPdfInTab,
        downloadPdf,
        printPdf,
        saveProposalData,
        sendPdfToMail,
    } = useProposalContext();

    return (
        <>
            <Subheading>Final PDF:</Subheading>
            <div className="flex items-center mb-3">
                <BaseButton
                    variant="ghost"
                    size="sm"
                    onClick={removeFinalPdf}
                >
                    <MoveLeft className="w-5 h-5" />
                    Back to Live Preview
                </BaseButton>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2 my-1">
                <BaseButton
                    tooltipLabel="Preview proposal in new tab"
                    onClick={previewPdfInTab}
                    size="sm"
                    variant="outline"
                >
                    <Eye className="w-5 h-5" />
                    Preview
                </BaseButton>
                <BaseButton
                    tooltipLabel="Download proposal PDF"
                    onClick={downloadPdf}
                    size="sm"
                    variant="outline"
                >
                    <DownloadCloudIcon className="w-5 h-5" />
                    Download
                </BaseButton>

                <BaseButton
                    tooltipLabel="Print proposal"
                    onClick={printPdf}
                    size="sm"
                    variant="outline"
                >
                    <Printer className="w-5 h-5" />
                    Print
                </BaseButton>

                <BaseButton
                    tooltipLabel="Save proposal"
                    onClick={saveProposalData}
                    size="sm"
                    variant="outline"
                >
                    <BookmarkIcon className="w-5 h-5" />
                    Save
                </BaseButton>

                <SendPdfToEmailModal sendPdfToMail={sendPdfToMail}>
                    <BaseButton
                        tooltipLabel="Send proposal PDF to mail"
                        size="sm"
                        variant="outline"
                    >
                        <Mail className="w-5 h-5" />
                        Send to mail
                    </BaseButton>
                </SendPdfToEmailModal>
            </div>
            <AspectRatio ratio={8.5 / 11}>
                <iframe
                    className="h-full w-full rounded-xl"
                    src={`${pdfUrl}#toolbar=0`}
                />
            </AspectRatio>
        </>
    );
}
